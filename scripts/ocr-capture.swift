import Foundation
import Vision
import ImageIO

let imageURL = URL(fileURLWithPath: CommandLine.arguments[1])
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
let handler = VNImageRequestHandler(url: imageURL)
try handler.perform([request])
let output: [[String: Any]] = (request.results ?? []).compactMap { observation in
    guard let text = observation.topCandidates(1).first?.string else { return nil }
    return ["text": text, "x": observation.boundingBox.midX, "y": 1 - observation.boundingBox.midY]
}
let data = try JSONSerialization.data(withJSONObject: output)
FileHandle.standardOutput.write(data)
