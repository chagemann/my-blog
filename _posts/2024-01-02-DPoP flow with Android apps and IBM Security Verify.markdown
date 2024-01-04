---
layout: single
title:  "Implement high assurance flows with IBM Security Verify and Android apps"
date:   2024-01-02 14:37:22 +1000
categories: OAuth DPoP Android Verify IAM
show_date: true
---

In this article, I am going to show you how to implement the use of 'Demonstration Proof-of-Possession' (`DPoP`) tokens from IBM Security Verify (ISV) into your mobile and custom web app.

I describe the mechanisms for the relevant parties (client, authorization server, resource server) and then explain how to implement the relevant steps in the demo environment. This environment includes IBM Security Verify, a custom web app and a mobile application.

<!-- TOC -->

- [Pre-requisite](#pre-requisite)
- [Introduction](#introduction)
- [Demo environment](#demo-environment)
    - [IBM Security Verify](#ibm-security-verify)
    - [Custom Web App](#custom-web-app)
        - [Setup](#setup)
        - [Endpoints](#endpoints)
    - [Mobile Apps](#mobile-apps)
    - [Android App](#android-app)
        - [Setup](#setup)
        - [Request DPoP Token](#request-dpop-token)
        - [Validate DPoP Token](#validate-dpop-token)
        - [Protecting the Signing Key](#protecting-the-signing-key)
- [Limitations](#limitations)
- [Conclusion](#conclusion)

<!-- /TOC -->

## Pre-requisite
You need access to an ISV tenant and the permission to configure an application. If you don't have access to an ISV tenant, you can start your trail [here](https://www.ibm.com/products/verify-identity). You also need to be able to build and run an Android or iOS mobile application and a custom web app.

## Introduction
The ["OAuth Demonstrating Proof of Possession"](https://datatracker.ietf.org/doc/html/rfc9449) adds an extra layer of security to the OAuth 2.0 protocol. It requires clients to prove their possession of a specific key, usually a cryptographic one, when they access protected resources through APIs. This mechanism is crucial for enhancing security by reducing the risks that are associated with token leakage, unauthorized access, and various types of attacks. In situations that are demanding robust security, such as those involving API providers and clients, DPoP serves as a vital security feature. It also defines a mechanism to prevent malicious actors from using an OAuth token that they obtained illicitly. This mechanism includes checks to verify whether the application that is presenting the access token is the same one the access token was initially issued to. The application proves it by binding the 'DPoP' token to a privately generated key, which is securely held by the client.


This diagram demonstrates the flow:
<div class="mermaid">sequenceDiagram
participant mobileapp as Mobile App
participant isv as IBM Security Verify
participant webapp as Custom Web App
mobileapp-&gt;&gt;mobileapp: generate key pair 
mobileapp-&gt;&gt;mobileapp: generate DPoP header (JWT)
mobileapp-&gt;&gt;isv: token request
isv-&gt;&gt;isv: verifies DPoP header
isv-&gt;&gt;isv: generate access token
isv-&gt;&gt;isv: bind public key from JWT to access token
isv-&gt;&gt;mobileapp: access token
mobileapp-&gt;&gt;mobileapp: generate DPoP header
mobileapp-&gt;&gt;webapp: request resource with access token and DPoP header
webapp-&gt;&gt;webapp: extract access token and DPoP header
webapp-&gt;&gt;isv: introspect request for access token
isv-&gt;&gt;webapp: access token details
webapp-&gt;&gt;webapp: validates DPoP header and access token
alt DPoP validation successful
webapp-&gt;&gt;mobileapp: success
else DPoP validation failed
webapp-&gt;&gt;mobileapp: fail
end
</div>

Let's go through each step more in detail:
1. The mobile app generates a key pair in the secure storage.
1. The [DPoP Header](https://datatracker.ietf.org/doc/html/rfc9449#name-the-dpop-http-header) is a JSON Web Token (`JWT`) that includes the JSON Web Key (`JWK`) representation of the public key:
   - `typ`: must be `dpop+jwt`
   - `alg`: identifier for a JWS asymmetric digital signature algorithm
   - `jwk`: `{ "kty": "RSA" ...}`

   And a list of request-specific attributes in the payload:
   - `jti`: unique identifier
   - `iat`: creation timestamp of the JWT
   - `htm`: the value of the HTTP method (for example `GET`, `POST`)
   - `htu`: the URI of the request without query and fragment parts

   It is signed with the private key.

   Example of the header and payload structure:
   ```json
    {
        "alg": "RS256",
        "typ": "dpop+jwt",
        "jwk": {
            "kty": "RSA",
            "kid": "91e1b216-d330-47ec-b6a1-89c81049ff9f",
            "n": "0rP7xyhCH6Lauw5mA2nokBElT1NQ-zOAK4ybfIe-tEE_JRbXc-OCveJnQ8hHCFtjq9vZyHIqxA3TzQgnMP86ozLMqPt3BoxbSg7dAxXZ8UfNnwU--baVcXBKMVhc_vas8ZDWdI2BUBQqkLsdmzRdiXKwROMamVUzXoTNxHj513Ac-hcEZBaM7cLKADKCVjAl4h9Ui_Bep3IKxPfeGRf34yc_lxDxo08jc9ZPDW5LY76TOTGncKq7dJp7A0Z2btIX6mL-z6ctsfCFRfcGeL8w5umyxuNhXrut7LQd_d5KwClQXeTKEE7IRymK96pWiCldECdwfo0Fgrt7ZvxnsIB2eQ",
            "e": "AQAB"
        }
    }
    
    {
        "jti": "rImC2rQeKg2J1sQcUKRhqw",
        "iat": 1698124549,
        "htm": "POST",
        "htu": "https://your-tenant.verify.ibm.com/oauth2/token"
    }
    ```

1. That `JWT` is sent as the `DPoP` header in the token request.
1. The authorization server extracts the `DPoP` header and verifies its signature.
1. An access token of type `DPoP` is generated for the client.
1. As part of this process, the thumbprint is generated from the `JWK` embedded in the `DPoP` proof and added to the authorization grant as part of the "confirmation" claim (`cnf`). This confirmation claim is then made available as part of the token introspection response (see 12. in this list).
1. The access token of type `DPoP` is issued to the client.
1. Every time the client wants to make a request with the issued `DPoP` token, it must generate a corresponding `DPoP` header. That header contains the same values as in 2. and according to the request:
   - `ath`: `base64url` encoded `SHA256` hash of the access token
1. The request is made to the resource server, including the generated `DPoP` header and `DPoP <access token>` as the `Authorization` header. This prefix indicates the use of a DPoP-bound token and requires the proof to be included as part of the `DPoP` header.
1. The resource server extracts the `DPoP` header and access token from the request.
1. The resource server calls the authorization server to introspect the token, for example [here](https://docs.verify.ibm.com/verify/reference/handleintrospect_0-2).
1. The authorization server returns the introspection details of the access token.
1. The resource server performs a [couple of checks](https://datatracker.ietf.org/doc/html/rfc9449#name-checking-dpop-proofs) to validate the `DPoP` token and the request. The "proof of possession" is validated by:
    - comparing the `ath` value from the `DPoP` header with the computed value of the access token
    - comparing the bas64url encoding `SHA256` hash of the public key from the `DPoP` header with the `cnf.jkt` attribute from the introspection response
1. If all validations are successful, the access to the resource is granted.
1. Or rejected otherwise.

## Demo environment
I provide a sample app for Android and a web app that allows you to test the described flow end-to-end.

### IBM Security Verify
1. Login to your tenant as an administrator.
1. From the sidebar menu: `Applications` --> `Applications`
1. Click `Add Application`
1. In the search bar, type in `open` and select `OpenID Connect` in the list of available applications and click `Add Application` (lower right button)
1. Fill-in the values for the required attributes and configure the application as you need.
1. The relevant parts for this demo are on the `Sign-on` tab:
   - for `Grant types` select `Authorization code` and `Client credentials`
   - in the `Proof-of-Possession settings` section (further below), select `Enforce DPoP-bound access token`
1. Click `Save`
1. That saves your configuration and creates the `Client ID` and `Client secret`. Take note of these values - they are needed to configure the mobile and web application.
  
   <img src="../assets/images/isv_oidc_app_config.png" alt="image" width="700" height="auto">

### Custom Web App
The custom web app mimics a resource server that validates DPoP tokens. 

#### Setup
1. Download the demo app from [here](https://github.com/IBM-Security/verify-saas-resources/tree/main/apps/oauth/dpop/Web)
1. Configure the relevant parameter in `app.js`
1. Run `node install`
1. Start the server by `node app.js`

That starts the server on `https://localhost:8080`.

#### Endpoints
It provides two endpoints:
1. `/status` GET - returns `Running`
1. `/validate-token` GET - validates the DPoP token. Returns `HTTP 204` if the token is successfully validated. Or `HTTP 401` otherwise.

Upon receiving a request, the server extracts the DPoP header (`JWT`) and access token:
```javascript
const accessToken = request.headers.authorization.split(" ")[1]
const dpopHeader = request.headers["dpop"]
```

It then checks that only one `DPoP` header is present...
```javascript
let dpopProof = true
dpopProof = dpopProof && (request.headers["dpop"].split(',').length == 1)
console.log("There is only one DPoP HTTP request header field: " + dpopProof)
```

...and validates the signature of the `JWT` and extracts the payload...
```javascript
let dpopHeaderUnpacked = await jose.JWS.createVerify().verify(dpopHeader, { allowEmbeddedKey: true })
let jsonPayload = JSON.parse(dpopHeaderUnpacked.payload)
```
...and then does the remaining checks that are listed in [https://datatracker.ietf.org/doc/html/rfc9449#name-checking-dpop-proofs](https://datatracker.ietf.org/doc/html/rfc9449#name-checking-dpop-proofs)

3. All required claims are contained in the `JWT`
    ```javascript
    dpopProof = dpopProof && (jsonPayload.htu !== undefined)
    ...
    // htu, htm, ath, jti, ait must be present
    ```
4. The type JOSE Header Parameter has the value `dpop+jwt`
    ```javascript
    dpopProof = dpopProof && (dpopHeaderUnpacked.header.typ === "dpop+jwt")
    ```
5. The `alg` JOSE Header Parameter indicates a registered asymmetric digital signature algorithm
    ```javascript
    dpopProof = dpopProof && (dpopHeaderUnpacked.header.alg === "RS256")
    ```
8. The `htm` claim matches the HTTP method of the current request
    ```javascript
    dpopProof = dpopProof && (jsonPayload.htm === request.method)
    ```
9. The `htu` claim matches the HTTP URI value for the HTTP request
    ```javascript
    const fullUrl = request.protocol + '://' + request.get('host') + request.originalUrl
    dpopProof = dpopProof && (jsonPayload.htu === fullUrl)
    ```
11. The creation time of the JWT is within an acceptable window
    ```javascript
    const timeInSec = new Date().getTime() / 1000
    dpopProof = dpopProof && (iat < timeInSec + 1) && (exp > timeInSec)
    ```
12. The value of the ath claim equals the hash of that access token
    ```javascript
    let digest = crypto.createHash('sha256').update(accessToken).digest()
    let atHash = jose.util.base64url.encode(digest);
    dpopProof = dpopProof && (atHash === jsonPayload.ath)
    ```

    The public key to which the access token is bound matches the public key from the `DPoP` proof:
    ```javascript
    let thumbprint = await dpopHeaderUnpacked.key.thumbprint('SHA-256');
    computedFingerprint = jose.util.base64url.encode(thumbprint);
    ...
    doTokenInspectionRequest(accessToken).then((response) => {
        const introspectionResponse = JSON.parse(response)
        dpopProof = dpopProof && (introspectionResponse["cnf"]["jkt"] !== undefined)
        dpopProof = dpopProof && (introspectionResponse["cnf"]["jkt"] === computedFingerprint)
      })
    ```

For validating that the client is the legitimate owner of the access token, the resource server verifies that the public key to which the access token is bound (the `jkt.cnf` claim) matches the public key of the DPoP proof (from the `DPoP` header). It also verifies that the access token hash in the DPoP proof matches the access token that is presented in the request.

For the request to be successful, each of the checks that are listed above need to be passed.

When successfully validated, the `accessToken` is added to a cache along with its expire time (`exp` value). That cache is checked before an introspection call if the `accessToken` is present and not expired to avoid unnecessary network requests.

### Mobile Apps
The mobile apps demonstrate how to obtain a `DPoP` token from IBM Security Verify and how that token is used in subsequent requests to the resource server.

*** CAUTION ***
The recommendation for a mobile application is to obtain an authorization code with a browser authorization flow as described in [OAuth 2.0 for Native Apps](https://www.rfc-editor.org/rfc/rfc8252.txt) and exchanges that code for an access token.

I use the [OAuth Client Credentials](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1) flow in the demo app for not unnecessarily bloating the code. It is _not_ recommended to store `Client ID` and `Client secret` in a mobile application in production as a bad actor will extract those credentials. 

### Android App

#### Setup
1. Download the demo app from [here](https://github.com/IBM-Security/verify-saas-resources/tree/main/apps/oauth/dpop/Android)
1. Open the app in "Android Studio"
1. Configure the relevant parameters in `MainActivity.kt`: the `resourceServer` is the IP address of the [custom web app](#custom-web-app)

The app presents a single activity, showing the configuration and two buttons to request and validate a DPoP token:<br/>
<img src="../assets/images/android_request_token.png" alt="image" width="300" height="auto">&nbsp;&nbsp;&nbsp;&nbsp;
<img src="../assets/images/android_validate_token.png" alt="image" width="300" height="auto">

In this demo app, I use the [`jose4j` library](https://bitbucket.org/b_c/jose4j) that provides convenient support for the JSON Object Signing and Encryption (JOSE) standards. 

#### Request DPoP Token
For every network request to the authorization and resource servers the app adds a `DPoP` header that is generated in the `generateDpopHeader` function:

{% include codeHeader.html %}
```kotlin
private fun generateDpopHeader(htu: String, htm: String, accessToken: String?): String {
    val jwtClaims: JwtClaims = JwtClaims()
    jwtClaims.setGeneratedJwtId()
    jwtClaims.setIssuedAtToNow()
    jwtClaims.setClaim("htm", htm)
    jwtClaims.setClaim("htu", htu)
    if (accessToken != null) {
        val bytes = accessToken.toByteArray(StandardCharsets.UTF_8)
        val messageDigest = MessageDigest.getInstance("SHA-256")
        messageDigest.update(bytes, 0, bytes.size)
        val digest = messageDigest.digest()
        val base64encodedFromDigest =
            Base64.getUrlEncoder().withoutPadding().encodeToString(digest)
        Log.d(TAG, "Token: $accessToken")
        Log.d(TAG, "Base64 encoded (digest): $base64encodedFromDigest")
        jwtClaims.setClaim("ath", base64encodedFromDigest)
    }
    val jws: JsonWebSignature = JsonWebSignature()
    jws.payload = jwtClaims.toJson()
    jws.key = getRsaSigningKey()
    jws.algorithmHeaderValue = "RS256"
    jws.jwkHeader = RsaJsonWebKey(keyStore.getCertificate(RSA_KEY_NAME).publicKey as RSAPublicKey)
    jws.setHeader("typ", "dpop+jwt")
    return jws.compactSerialization
}
```

The token request is sent to the server:
```
--> POST https://your-tenant.verify.ibm.com/oauth2/token
Content-Type: application/x-www-form-urlencoded
Content-Length: 114
Accept: application/json
DPoP: ey... from generateDpopHeader(...)
client_id=...&client_secret=...&grant_type=client_credentials&scope=openid
--> END POST (114-byte body)
<-- 200 https://your-tenant.verify.ibm.com/oauth2/token (2672ms)
x-backside-transport: OK OK
content-type: application/json;charset=UTF-8
content-length: 274
date: Fri, 27 Oct 2023 01:34:13 GMT
{"access_token":"abc...123","expires_in":1799,"grant_id":"228048a8-2de0-42f0-8642-0111eb8a0c17","scope":"openid","token_type":"DPoP"}
<-- END HTTP (274-byte body)
```

The server returns an access token of type `DPoP`. 

Also note the absence of a refresh token because of `grant_type=client_credentials`. From the [docs](https://docs.verify.ibm.com/verify/reference/handletoken-1):
> The refresh token that is used to obtain new access tokens. It is only available for `authorization_code` grant if the `refresh_token` grant is enabled.


#### Validate DPoP Token
With the `DPoP` token, the app can perform subsequent requests to the resource server. For each request, a new `DPoP` header needs to be constructed with the `generateDpopHeader(...)` method listed above...

{% include codeHeader.html %}
```kotlin
val headers = HashMap<String, String>()
headers["DPoP"] = generateDpopHeader(
    htu = resourceEndpoint,
    htm = "GET",
    accessToken = dpopToken.accessToken)
```

...and the `/validate-token` endpoint ot the custom web app is called:
```kotlin
apiService.validateDpopToken(
    headers,
    String.format("DPoP %s", dpopToken.accessToken),
    resourceEndpoint)
    .enqueue(object : Callback<ResponseBody> {
        override fun onResponse(
            call: Call<ResponseBody>,
            response: Response<ResponseBody>
        ) {
            if (response.isSuccessful) {
                Log.d(TAG, "DPoP token validation successful")
            } else {
                Log.d(TAG, "DPoP token validation failed")
            }
        }

        override fun onFailure(call: Call<ResponseBody>, t: Throwable) {
            throw (t)
        }
    })
```

```
--> GET http://your-resource-server:8080/validate-token
Accept: application/json
DPoP: ey... from generateDpopHeader(...)
Authorization: DPoP abc...123
--> END GET
```

#### Protecting the Signing Key
The RSA keypair that is bound to the access token and that used to sign the `JWT`, is generated in the Android keystore to protect it.

{% include codeHeader.html %}
```kotlin
private fun getRsaSigningKey() : Key {

        if (keyStore.containsAlias(RSA_KEY_NAME)) {
            Log.d(TAG, "Key $RSA_KEY_NAME found in KeyStore")
        } else {
            val keyGenParameterSpec = KeyGenParameterSpec.Builder(
                RSA_KEY_NAME,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
            )
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
                .setAlgorithmParameterSpec(RSAKeyGenParameterSpec(2048, RSAKeyGenParameterSpec.F4))
                .build();

            val keyPairGenerator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA,ANDROID_KEYSTORE)
            keyPairGenerator.initialize(keyGenParameterSpec)
            Log.d(TAG, "Key $RSA_KEY_NAME generated")
            keyPairGenerator.generateKeyPair()
        }

        return keyStore.getKey(RSA_KEY_NAME, null)
    }
```
This key might be rotated for every token request.

The private key is passed into the `JWS` for the signing operation...
```kotlin
jws.key = getRsaSigningKey()
```

...and the public key is added as a `JWK` header:
```kotlin
jws.jwkHeader = RsaJsonWebKey(keyStore.getCertificate(RSA_KEY_NAME).publicKey as RSAPublicKey)
```

<!-- ### iOS App
The original post includes an iOS section, written by my co-worker. I just link it here, as I don't want to claim credit for that. -->

## Limitations
Using `DPoP` prevents bad actors from getting access to protected resources by extracting an access token from a client. They would also need access to the crypto key that is bound to that token - that significantly increases the complexity of an attack.

However, it does not guarantee that only your client (your "mobile app") can access a resource. If the API is known, an API client can be used to generate the `DPoP` header and to simulate the behavior of a mobile app.

## Conclusion
OAuth DPoP support is relevant for businesses that rely on OAuth 2.0 for securing their APIs, particularly when strong security and protection against certain types of attacks are crucial, for example financial institutions. OAuth DPoP enhances the security of OAuth 2.0 by providing a way to prove the possession of a cryptographic key when making requests to an OAuth-protected API. 

In summary, I described the mechanisms for the relevant parties (client, authorization server, resource server) and explained how to implement the relevant steps in a demo environment, including IBM Security Verify, a custom web app and a mobile application.


---

_"Nobody is so good that has nothing to learn,<br/>and nobody so bad that has nothing to share."_
{: style="text-align: center;"}