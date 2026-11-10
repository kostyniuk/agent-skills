import CoreGraphics
import Foundation
// Usage: drag <x1> <y1> <x2> <y2>  (screen points)
let a = CommandLine.arguments.dropFirst().map { Double($0)! }
let from = CGPoint(x: a[0], y: a[1]), to = CGPoint(x: a[2], y: a[3])
func post(_ type: CGEventType, _ p: CGPoint) {
  CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: p, mouseButton: .left)?.post(tap: .cghidEventTap)
}
post(.mouseMoved, from); usleep(100_000)
post(.leftMouseDown, from); usleep(100_000)
for i in 1...30 {
  let t = Double(i) / 30
  post(.leftMouseDragged, CGPoint(x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t)); usleep(15_000)
}
post(.leftMouseUp, to)
