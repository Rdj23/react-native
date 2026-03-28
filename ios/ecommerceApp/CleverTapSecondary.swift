import Foundation
import CleverTapSDK

/**
 * Native module that exposes a secondary CleverTap instance to React Native (iOS).
 * This allows sending events to a separate CleverTap dashboard while the
 * default instance continues to use the primary dashboard.
 */
@objc(CleverTapSecondary)
class CleverTapSecondary: NSObject, CleverTapProductConfigDelegate {

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
    secondaryInstance?.productConfig().delegate = self
    NSLog("CleverTapSecondary: Secondary instance initialized successfully")
  }

  // MARK: - CleverTapProductConfigDelegate

  /// Called when fetch completes — auto-activate
  func ctProductConfigFetched() {
    NSLog("CleverTapSecondary: Product config FETCHED — activating now...")
    secondaryInstance?.productConfig().activate()
  }

  /// Called when activation completes — emit event to JS
  func ctProductConfigActivated() {
    NSLog("CleverTapSecondary: Product config ACTIVATED — values ready")
    sendEvent(withName: "CleverTapSecondaryProductConfigActivated", body: nil)
  }

  /// Emit events to React Native
  private func sendEvent(withName name: String, body: Any?) {
    // Use the bridge to send events
    if let bridge = RCTBridge.current() {
      bridge.eventDispatcher()?.sendAppEvent(withName: name, body: body)
    }
  }

  // MARK: - Event emitter support
  @objc override func supportedEvents() -> [String] {
    return ["CleverTapSecondaryProductConfigActivated"]
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

  // MARK: - Product Config (Product Experiences)

  /// Triggers a fetch of the latest Product Config values from Dashboard 2.
  @objc func productConfigFetch() {
    guard let instance = secondaryInstance else {
      NSLog("CleverTapSecondary: Instance not initialized, cannot fetch product config")
      return
    }
    instance.productConfig().fetch()
    NSLog("CleverTapSecondary: Product config fetch triggered")
  }

  /// Activates the most recently fetched Product Config so values are readable.
  @objc func productConfigActivate() {
    guard let instance = secondaryInstance else {
      NSLog("CleverTapSecondary: Instance not initialized, cannot activate product config")
      return
    }
    instance.productConfig().activate()
    NSLog("CleverTapSecondary: Product config activated")
  }

  /// Convenience: fetches AND activates in one call.
  @objc func productConfigFetchAndActivate() {
    guard let instance = secondaryInstance else {
      NSLog("CleverTapSecondary: Instance not initialized")
      return
    }
    instance.productConfig().fetchAndActivate()
    NSLog("CleverTapSecondary: Product config fetch and activate triggered")
  }

  /// Sets the minimum interval between successive fetches.
  @objc func productConfigSetMinimumFetchIntervalInSeconds(_ seconds: Double) {
    guard let instance = secondaryInstance else { return }
    instance.productConfig().setMinimumFetchInterval(Int(seconds))
    NSLog("CleverTapSecondary: Product config minimum fetch interval set to %f s", seconds)
  }

  /// Reads a boolean value from the activated Product Config.
  @objc func productConfigGetBoolean(_ key: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let instance = secondaryInstance else {
      resolve(false)
      return
    }
    let value = instance.productConfig().get(key)
    resolve(value?.boolValue ?? false)
  }

  /// Reads a numeric value from the activated Product Config.
  @objc func productConfigGetLong(_ key: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let instance = secondaryInstance else {
      resolve(0)
      return
    }
    let value = instance.productConfig().get(key)
    resolve(value?.numberValue ?? 0)
  }

  /// Reads a string value from the activated Product Config.
  @objc func productConfigGetString(_ key: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let instance = secondaryInstance else {
      resolve("")
      return
    }
    let value = instance.productConfig().get(key)
    resolve(value?.stringValue ?? "")
  }

  /// Resets the Product Config cache so the next fetch pulls fresh values.
  @objc func productConfigReset() {
    guard let instance = secondaryInstance else { return }
    instance.productConfig().reset()
    NSLog("CleverTapSecondary: Product config reset")
  }
}
