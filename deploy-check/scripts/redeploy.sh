#!/usr/bin/env bash
# redeploy.sh <deployment> <sha> <env>...   env: qa | staging
# Waits for the <DEV_BRANCH> pipeline that contains <sha>, then restarts every deployment running that image
# on each env whose pods don't already run the published digest. Needs glab, aws (ECR read) and an ssh alias per env
# with kubectl. Fill the <PLACEHOLDERS> below; for another code host or registry, swap glab api / aws ecr.
set -euo pipefail

declare -A NAMESPACES=([qa]="<QA_NAMESPACE>" [staging]="<STAGING_NAMESPACE>")
DEV_BRANCH="<DEV_BRANCH>"
IMAGE_TAG="<DEV_IMAGE_TAG>"
REGISTRY_REGION="<REGISTRY_REGION>"
declare -A PROJECTS=(
  ["<deployment-built-in-another-repo>"]="<GROUP>/<repo>"
)
POLL=${POLL:-30}
PIPELINE_TIMEOUT=${PIPELINE_TIMEOUT:-2700}

die() { echo "STOP: $*" >&2; exit 1; }

[ $# -ge 3 ] || die "usage: redeploy.sh <deployment> <sha> <qa|staging>..."
deploy=$1 sha=$2; shift 2
for env in "$@"; do [ -n "${NAMESPACES[$env]:-}" ] || die "$env: only qa and staging are redeployed automatically"; done
project=${PROJECTS[$deploy]:-"<GROUP>/$deploy"}
api="projects/${project//\//%2F}"

contains_fix() { [ "$(glab api "$api/repository/merge_base?refs[]=$sha&refs[]=$1" | jq -r .id)" = "$sha" ]; }

landed_at() {
  local landed=""
  while read -r psha created; do
    contains_fix "$psha" || break
    landed=$created
  done < <(glab api "$api/pipelines?ref=$DEV_BRANCH&per_page=20" | jq -r '.[] | "\(.sha) \(.created_at)"')
  echo "$landed"
}

wait_pipeline() {
  local waited=0 pipeline
  while :; do
    pipeline=$(glab api "$api/pipelines?ref=$DEV_BRANCH&per_page=1" | jq -c '.[0]')
    if contains_fix "$(jq -r .sha <<<"$pipeline")"; then
      case $(jq -r .status <<<"$pipeline") in
        success) echo "pipeline $(jq -r .web_url <<<"$pipeline") passed" >&2; return ;;
        failed|canceled|skipped|manual) die "$DEV_BRANCH pipeline $(jq -r '"\(.status): \(.web_url)"' <<<"$pipeline")" ;;
      esac
    fi
    [ $waited -lt $PIPELINE_TIMEOUT ] || die "no passed $DEV_BRANCH pipeline containing $sha after $((PIPELINE_TIMEOUT / 60)) min"
    sleep $POLL; waited=$((waited + POLL))
  done
}

running_digests() {
  jq -r --arg d "$1" '
    (.items[] | select(.kind == "Deployment" and .metadata.name == $d) | .spec.selector.matchLabels) as $sel
    | .items[] | select(.kind == "Pod" and .metadata.deletionTimestamp == null)
    | select(.metadata.labels as $l | $sel | to_entries | all(.value == $l[.key]))
    | .status.containerStatuses[0].imageID | sub(".*@"; "")' <<<"$2" | sort -u
}

env_state() { ssh -o BatchMode=yes "$1" "kubectl -n ${NAMESPACES[$1]} get deploy,pods -o json"; }

branch_image() {
  local image
  image=$(jq -r --arg d "$deploy" '.items[] | select(.kind == "Deployment" and .metadata.name == $d) | .spec.template.spec.containers[0] | "\(.image) \(.imagePullPolicy)"' <<<"$2")
  [ -n "$image" ] || die "$1: no deployment $deploy in ${NAMESPACES[$1]}"
  [[ $image == *":$IMAGE_TAG Always" ]] || die "$1: $deploy runs '$image', not the moving $IMAGE_TAG tag; it needs a real deploy"
  echo "${image% Always}"
}

redeploy_env() {
  local env=$1 ns=${NAMESPACES[$1]} state image targets stale=() d
  state=$(env_state "$env")
  image=$(branch_image "$env" "$state")
  targets=$(jq -r --arg i "$image" '.items[] | select(.kind == "Deployment" and .spec.replicas > 0 and .spec.template.spec.containers[0].image == $i) | .metadata.name' <<<"$state")

  for d in $targets; do
    [ "$(running_digests "$d" "$state")" = "$digest" ] || stale+=("$d")
  done
  if [ ${#stale[@]} -eq 0 ]; then
    echo "$env: $targets already on $digest, no restart"
    return
  fi

  echo "$env: restarting ${stale[*]}" >&2
  ssh -o BatchMode=yes "$env" "kubectl -n $ns rollout restart ${stale[*]/#/deploy/} >&2 && for d in ${stale[*]}; do kubectl -n $ns rollout status deploy/\$d --timeout=10m >&2; done"
  state=$(env_state "$env")
  for d in "${stale[@]}"; do
    [ "$(running_digests "$d" "$state")" = "$digest" ] || die "$env: $d still runs $(running_digests "$d" "$state" | tr '\n' ' ')after restart, expected $digest"
  done
  echo "$env: ${stale[*]} now run $digest (restarted $(date -u +%FT%TZ))"
}

for env in "$@"; do repo=$(branch_image "$env" "$(env_state "$env")"); done
repo=${repo#*/}; repo=${repo%:*}
full_sha=$(glab api "$api/repository/commits/$sha" 2>/dev/null | jq -r '.id // empty') || true
[ -n "$full_sha" ] || die "commit $sha not found in $project"
sha=$full_sha
wait_pipeline
landed=$(landed_at)
read -r digest pushed < <(aws ecr describe-images --region "$REGISTRY_REGION" --repository-name "$repo" --image-ids imageTag="$IMAGE_TAG" \
  --query 'imageDetails[0].[imageDigest,imagePushedAt]' --output text)
[[ "$(date -d "$pushed" +%s)" -ge "$(date -d "$landed" +%s)" ]] || die "$repo:$IMAGE_TAG was pushed $pushed, before the fix reached $DEV_BRANCH ($landed); the pipeline didn't publish it"

for env in "$@"; do redeploy_env "$env"; done
