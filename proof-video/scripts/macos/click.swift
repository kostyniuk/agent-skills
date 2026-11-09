import CoreGraphics
import Foundation
// Usage: click <x> <y> [double]  (screen points)
let args = CommandLine.arguments
let point = CGPoint(x: Double(args[1])!, y: Double(args[2])!)
let clicks = args.count > 3 ? 2 : 1
CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: point, mouseButton: .left)?.post(tap: .cghidEventTap)
usleep(80_000)
for n in 1...clicks {
  let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left)
  down?.setIntegerValueField(.mouseEventClickState, value: Int64(n))
  down?.post(tap: .cghidEventTap)
  let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left)
  up?.setIntegerValueField(.mouseEventClickState, value: Int64(n))
  up?.post(tap: .cghidEventTap)
  usleep(60_000)
}
