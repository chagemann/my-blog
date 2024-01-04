---
layout: single
title:  "Create your own authenticator"
date:   2023-10-23 22:54:00 +1000
categories: Verify-SDK Android
show_date: true
thumbnail: /assets/images/create_your_authenticator_flow.png
---

The IBM Verify SDK 2.x provides developers a convenient way to create their own authenticator with IBM Security Verify (ISV - Cloud) and IBM Security Verify Access  (ISVA - OnPrem ) solutions without the need of handling different APIs. This article will guide you through the necessary steps of how to create an authenticator instance in a mobile application using the IBM Verify SDK. Despite that the code below is for the Android platform, the flow diagram and the principle steps can be applied to iOS as well.

> This is a re-post of an article that I wrote for IBM in 2018. The original blog was discontinued, so I reposted it here, including some minor adjustments.

## Pre-requisites
An account on IBM Security Verify or an IBM Security Verify Access appliance, configured with the [cookbook for Multi-Factor Authentication](https://ibm.biz/Verify_Access_MMFA_cookbook). The user needs to login into his account and shown a QR code.

Download the IBM Security Verify SDK from [here](https://exchange.xforce.ibmcloud.com/hub/extension/91efa587eef9f210e903add92459ae1b) (IBM id required).

## The work flow
This flow chart shows a high-level overview of the required steps to implement. They will be explained and associated with code in the next section.

![Work flow](../assets/images/create_your_authenticator_flow.png)

## The code
The IBM Verify SDK uses callbacks to inform the developer about the result of the calls being made. Whilst it is possible to chain those callbacks together in a nested fashion, we recommend to use the `RxJava2` library with the supported observer pattern to compose asynchronous sequences.

### Invoke the QR code scanner
You could invoke the scanner that is part of the SDK. This is usually implemented in an `onClickButton` event like this:

{% include codeHeader.html %}
```java
final int SCAN_QR_REQUEST = 24

public void onClickScanQRCode(View view) {

    Intent intent = new Intent(getApplicationContext(), UIQRScanView.class);
    startActivityForResult(intent, SCAN_QR_REQUEST);    // [01]
}
```


This will ask the user for permission to invoke the camera (if haven’t done previously) and continue accordingly. If you implement your own scanner, it should return an `IQRScanResult` object.

### Return `IQRScanResult`
When the SDK detects a valid QR code, it will close the camera and return the `IQRScanResult` to the calling activity.

{% include codeHeader.html %}
```java
protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    if (requestCode == SCAN_QR_REQUEST && data != null && data.hasExtra(IQRScanResult.class.getName())) {
        IQRScanResult scanResult = (IQRScanResult)data.getExtras().get(IQRScanResult.class.getName());    // [03]
        // ... 
        // add code from next section
```

### AuthenticatorContext.create(…)
Register your device with the server and receive the OAuth token and metadata. The `scanResult` from the previous step does not need to be cast.

{% include codeHeader.html %}
```java
AuthenticatorContext.sharedInstance().create(scanResult,    // [04]
        new IResultCallback() {
            @Override
            public void handleResult(IAuthenticator iAuthenticator, VerifySdkException e) {    // [07]

                if (e != null) {
                    if (iAuthenticator instanceof IMfaAuthenticator) {
                        // ...
                        // add code from next section
                    } else {
                        // OTP authenticator --> done
                    }
                } else {
                    Log.e(TAG, "Error: " + e.toString())
                }
            }
        });
```

An authenticator is returned according to the provided QR code or an Exception in case of an error. The authenticator contains an `OAuthToken` object, a list of available `AuthenticationMethods` and `metadata` (account name, identifiers, additional data, etc.). If the scanner has returned a `OtpQrScan`, you will get an `OtpAuthenticator` here and no further steps are required.

### Generate key pair
Part of the enrollment payload is a public key that is used to verify the response from the client in a Challenge-Response Flow. The key name needs to have a certain format, so that the SDK can find it during the enrollment process and we do not need to pass key names around in method calls. The method `IAuthenticator.getKeyName(SubType)` returns a key name in the required format.

If the flag `authenticationRequired` is set to `true`, the user needs to authenticate either by PIN, pattern, fingerprint or password before the key can be used. That means, a key to be used to enroll a fingerprint method should be created with `authenticationRequired = true`. However, this setting comes with a few implications that you should consider beforehand:

1. In IBM Security Verify, the scope of an `OAuth` token is restricted: you can only enroll methods with the access token that you got from the registration call. As soon as that token has been refreshed, you can not further enroll or unenroll any methods.
2. For Android, a key that requires authentication will become invalid if one of these events happen:
   - another fingerprint added
   - all fingerprints removed
   - secure lock screen disabled
   - secure lock screen forcibely reseted

When these two things combined together, it means if you create a key that requires authentication and after the token refresh, the user e.g. adds another fingerprint, all `SignatureAuthenticationMethods` that use protected keys ***can not be used anymore***. If you want to enroll those methods again, you would have to re-register the authenticator, starting from the QR code scan, because the current token does not allow you to change the enrollment.

On-Premise installations do not have the restriction of not allowing enrollments after token refresh, but keys with authentication will become invalidated as well. It is possible to handle that event and trigger a re-enrollment of the authentication method in question.

For further documentation about to use protected keys, have a read at [https://developer.android.com/training/articles/keystore#UserAuthentication](https://developer.android.com/training/articles/keystore#UserAuthentication).

The following code creates a new thread for each available authentication method (except for `TotpAuthenticationMethod`, as there is no key required for that method) and generates a key pair. The public key and potential error object is returned in the callback. In case of success, the public key is set for the current method. For ISV, the signed `authenticatorId` needs to be added to the payload for enrollment. That is used on server side to validate the submitted public key.

{% include codeHeader.html %}
```java
IMfaAuthenticator mfaAuthenticator = (IMfaAuthenticator) iAuthenticator;
Observable signatureAuthenticationMethodObservable = Observable.fromIterable(mfaAuthenticator.getAvailableMethods());

signatureAuthenticationMethodObservable
      .subscribeOn(Schedulers.computation())
      .flatMap(new Function<AuthenticationMethod, ObservableSource>() {
            @Override
            public ObservableSource apply(AuthenticationMethod authenticationMethod) {

               if (authenticationMethod instanceof TotpAuthenticationMethod)
                  return Observable.empty();

               String keyName = mfaAuthenticator.getKeyName(authenticationMethod.getSubType());    // [08][09]
               boolean authenticationRequired = false;

               KeyStoreHelper.createKeyPair(keyName, Algorithm.valueOf(authenticationMethod.getAlgorithm()).getAlgorithm(),    // [10]
                        authenticationRequired, new IResultCallback() {
                           @Override
                           public void handleResult(PublicKey publicKey, VerifySdkException e) {    // [12]

                              if (e == null) {
                                    SignatureAuthenticationMethod method = (SignatureAuthenticationMethod) authenticationMethod;
                                    method.setPublicKey(KeyStoreHelper.exportPublicKey(keyName, Base64.NO_WRAP));    // [13]

                                    if (iAuthenticator instanceof CloudAuthenticator) {
                                       method.setSignedData(KeyStoreHelper.signData(keyName, authenticationMethod.getAlgorithm(),  // [14][15][16]
                                                iAuthenticator.getIdentifier(), Base64.NO_WRAP));
                                    }

                              }
                              else {
                                    Log.e(TAG, "Error: " + e.toString());
                              }
                           }
                        });
               return Observable.empty();
            }
      })
      .toList()
   // ... 
   // add code from next section
```

### Enroll SignatureAuthenticationMethods
Once the keys have been created, we create a list of methods that we want to enroll and call the `AuthenticatorContext.enroll(...)` with that list. The callback returns a list of `VerifySdkExceptions` if the enrollment has failed (wrong data format, key could not be validated, etc.) and a `VerifySdkException` object if something went wrong on a network layer level (SSL checks failed, no connection, etc.). If both objects come back as null, that means that all enrollments have been successful.

The `MfaAuthenticator` instance gets updated by the SDK to reflect the methods enrolled (`IMfaAuthenticator.getEnrolledMethods(...)`).

{% include codeHeader.html %}
```java
...
.observeOn(AndroidSchedulers.mainThread())
    .subscribe(new DisposableSingleObserver<List>() {
        @Override
        public void onSuccess(List objects) {
            Log.i(TAG, "Keys successfully generated");

            ArrayList methodsToEnroll = new ArrayList();
            for (AuthenticationMethod authenticationMethod : mfaAuthenticator.getAvailableMethods())  {
                if (authenticationMethod instanceof SignatureAuthenticationMethod)    {
                    methodsToEnroll.add((SignatureAuthenticationMethod)authenticationMethod);    // [17]
                }
            }

            AuthenticatorContext.sharedInstance().enroll(mfaAuthenticator,    // [18]
                    methodsToEnroll, new IResultCallback<List>() {
                        @Override
                        public void handleResult(List verifySdkExceptionList, VerifySdkException verifySdkException) {    // [21]

                            if (verifySdkException != null) { // 'serious' issue, most likely network IO related
                                Log.e(TAG, "Error: " + verifySdkException.toString());
                                // move to error activity
                            }
                            else if (verifySdkExceptionList.size() > 0)    {

                                for (VerifySdkException v : verifySdkExceptionList) {
                                    Log.e(TAG, "Error: " + v.toString());
                                }
                                // move to error activity
                            }
                            else {
                                try {
                                    Log.i(TAG, "Authenticator:" + mfaAuthenticator.serializeToJson(false));
                                    // move to TOTP enrollment
                                } catch (VerifySdkException e1) {
                                    Log.e(TAG, "Error: " + e1.toString());
                                }
                            }
                        }
                    });
        }

        @Override
        public void onError(Throwable e) {

        }
    });
```

## Finally
If you want to use this in your own app, you would need to add functionality to enroll for `TOTP` as well as routines to save and re-instantiate the authenticator object from storage. For Proof-of-Concepts, there is a `IAuthenticator.serializeToJson(...)` method, which returns a JSON representation of the authenticator. That data can be stored in Shared Preferences and used as an input to the constructor for `CloudAuthenticator` and `OnPremiseAuthenticator` to re-instantiate the object.
 
The next steps could be to query the server for pending transactions or get notified about those via push notifications.

A demo app with the code above can be found in [GitHub](https://github.com/IBM-Security/verify-sdk-android/tree/master/samples/AuthenticatorDemo).

---

_"Quality means doing it right when no one is looking."_
<br/><br/>
Henry Ford
{: style="text-align: center;"}