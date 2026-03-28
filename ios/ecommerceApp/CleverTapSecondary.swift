import Foundation
import CleverTapSDK

/**
 * Native module that exposes a secondary CleverTap instance to React Native (iOS).
 * This allows sending events to a separate CleverTap dashboard while the
 * default instance continues to use the primary dashboard.
 */
@objc(CleverTapSecondary)
class CleverTapSecondary: NSObject {

  // Secondary dashboard credentials
  private static let accountId = "TEST-K9K-Z94-R46Z"
  private static let accountToken = "TEST-4c1-3c3"

  private var secondaryInstance: CleverTap?

  override init() {
    super.init()
    initializeSecondaryInstance()
  }

  /// Creates and configures the secondary CleverTap instance.
  private func initializeSecondaryInstance() {
    let config = CleverTapInstanceConfig(accountId: CleverTapSecondary.accountId,
                                         accountToken: CleverTapSecondary.accountToken)
    config.logLevel = .debug
    secondaryInstance = CleverTap.instance(with: config)
    NSLog("CleverTapSecondary: Secondary instance initialized successfully")
  }

  /// Required for React Native to run methods on the main queue
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  /// Records a simple event (no properties) on the secondary dashboard.
  @objc func recordEvent(_ eventName: String) {
    guard let instance = secondaryInstance else {
      NSLog("CleverTapSecondary: Instance not initialized, cannot record event: %@", eventName)
      return
    }
    instance.recordEvent(eventName)
    NSLog("CleverTapSecondary: Event recorded: %@", eventName)
  }

  /// Records an event with properties on the secondary dashboard.
  @objc func recordEventWithProps(_ eventName: String, properties: NSDictionary) {
    guard let instance = secondaryInstance else {
      NSLog("CleverTapSecondary: Instance not initialized, cannot record event: %@", eventName)
      return
    }
    instance.recordEvent(eventName, withProps: properties as? [String: Any] ?? [:])
    NSLog("CleverTapSecondary: Event recorded with props: %@", eventName)
  }

  /// Sets user profile properties on the secondary dashboard.
  @objc func profileSet(_ profile: NSDictionary) {
    guard let instance = secondaryInstance else {
      NSLog("CleverTapSecondary: Instance not initialized, cannot set profile")
      return
    }
    if let profileDict = profile as? [String: Any] {
      instance.profilePush(profileDict)
    }
    NSLog("CleverTapSecondary: Profile set on secondary instance")
  }

  /// Performs a user login on the secondary dashboard.
  @objc func onUserLogin(_ profile: NSDictionary) {
    guard let instance = secondaryInstance else {
      NSLog("CleverTapSecondary: Instance not initialized, cannot perform onUserLogin")
      return
    }
    if let profileDict = profile as? [String: Any] {
      instance.onUserLogin(profileDict)
    }
    NSLog("CleverTapSecondary: onUserLogin called on secondary instance")
  }

  /// Records a charged (purchase) event on the secondary dashboard.
  @objc func recordChargedEvent(_ chargeDetails: NSDictionary, items: NSArray) {
    guard let instance = secondaryInstance else {
      NSLog("CleverTapSecondary: Instance not initialized, cannot record charged event")
      return
    }
    let details = chargeDetails as? [String: Any] ?? [:]
    let itemList = items as? [[String: Any]] ?? []
    instance.recordChargedEvent(withDetails: details, andItems: itemList)
    NSLog("CleverTapSecondary: Charged event recorded on secondary instance")
  }
}
