import CoreGraphics
import Foundation
// Usage: hscroll <x> <y> <pixels> [steps]  -- smooth horizontal scroll (positive = right) at a point
let a = CommandLine.arguments.dropFirst().map { Double($0)! }
let p = CGPoint(x: a[0], y: a[1]); let total = Int32(a[2]); let steps = a.count > 3 ? Int32(a[3]) : 24
CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: p, mouseButton: .left)?.post(tap: .cghidEventTap)
usleep(30_000)
var sent: Int32 = 0
for i in 1...steps {
  let target = Int32((Double(total) * (1 - pow(1 - Double(i) / Double(steps), 2))).rounded())
  let d = target - sent; sent = target
  let e = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 2, wheel1: 0, wheel2: -d, wheel3: 0)
  e?.location = p
  e?.post(tap: .cghidEventTap)
  usleep(25_000)
}
