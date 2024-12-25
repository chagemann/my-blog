---
layout: single
title:  "Configuring verifiable links"
date:   2024-06-18 22:10:43 +1000
categories: android iOS deep-links universal-links fido passkeys mobile verify
show_date: true
excerpt: This blog post provides an step-by-step walkthrough on creating the `assetlinks.json` for Android and `apple-app-site-association` for iOS files in IBM Security Verify.
---

_Disclaimer: This article was originally written [for IBM](https://community.ibm.com/community/user/security/blogs/carsten-hagemann1/2024/06/10/configuring-verifiable-links)._

## Table of Contents
<!-- TOC -->
- [Concept](#concept)
- [Flow](#flow)
- [Use cases](#use-cases)
- [Set up Verifiable Links in IBM Security Verify](#set-up-verifiable-links-in-ibm-security-verify)
    - [Pre-requisite](#pre-requisite)
    - [Configure API client](#configure-api-client)
    - [Get an access token](#get-an-access-token)
    - [Create or update verifiable link files](#create-or-update-verifiable-link-files)
        - [Google](#google)
        - [Apple](#apple)
    - [Public access](#public-access)
    - [Troubleshooting](#troubleshooting)
- [Wrapping up](#wrapping-up)
<!-- /TOC -->

## Concept
The concept of "Verifiable Links" refers to the files used in mobile app development that facilitate the establishment of connections between mobile apps and associated websites or other apps. Namely, these files `assetlinks.json` for Android and `apple-app-site-association` for iOS, play a crucial role in enabling seamless navigation and communication between different digital experiences on mobile devices.

They serve as verification mechanisms to establish the association between mobile apps and their corresponding websites or other apps. They ensure that the app is authorized to handle specific URLs or links, enhancing the user experience by allowing direct navigation between different app environments without the need for intermediate steps.

In the case of Android, the `assetlinks.json` file contains digital asset link information, including the app's package name and the SHA-256 fingerprint of its signing certificate. This file is hosted on the website's domain and is used to enable Android App Links. Android App Links allow users to bypass the app chooser dialog and open specific URLs directly in the associated app.

For iOS, the `apple-app-site-association` file serves a similar purpose. This file is also hosted on the website's domain and contains JSON data specifying the app identifiers (Bundle IDs) and the corresponding website URLs. It is used along with Universal Links on iOS devices, enabling users to seamlessly transition from a website to the associated app without opening the Safari browser.

Overall, Verifiable Link Files are essential components of app-to-app linking and deep linking strategies on Android and iOS platforms. They facilitate a cohesive user experience by enabling smooth navigation between mobile apps and associated websites or other apps, enhancing the integration and interoperability of the digital ecosystem on mobile devices.

## Flow
When a user clicks on a link, several steps are typically involved in the flow, depending on the context and the platform. Here's a general overview of the flow that occurs when a user clicks on a link:

```mermaid
flowchart TB
    start([User clicks on link]) --> 
    step1([App is associated with schema])
    step1 -->|true| step2([App is associated with link])
    step1 -->|false| step3([Default action])
    step3 --> End
    step2 -->|true| step4([Association is verified])
    step2 -->|false| step3
    step4 -->|success| step5([App opens])
    step4 -->|failed| step3
    step5 --> step6([App receives link data])
    step6 --> End
```

1. User Interaction: The user clicks on a link, typically within a web browser, a messaging app, or another app.

1. Link Handling by the Operating System: The operating system of the device (e.g., Android or iOS) intercepts the link and determines how to handle it based on the link's scheme (for example, "https://" or "myapp://") and the registered apps capable of handling that scheme.

1. App Association Check: The operating system checks if any installed apps are associated with the link's scheme. If there is a registered app capable of handling the link, the flow continues with the next step. Otherwise, the default action defined by the operating system (usually opening the link in a web browser) is triggered.

1. Deep Linking or Universal Linking:
    - a) For Android, the `assetlinks.json` file (hosted on the website's domain) is checked to verify the association between the app and the link. If the association is confirmed, the deep link is sent to the app.
    - b) For iOS, the `apple-app-site-association` file (hosted on the website's domain) is checked to verify the association. If the app is associated with the link, the Universal Link mechanism opens the app directly.

1. App Navigation or Content Presentation: The associated app receives the deep link or Universal Link and processes it accordingly. The app may then navigate to a specific screen or present relevant content based on the link's parameters or metadata.

The specific implementation and flow may vary depending on the platform, the app's design, and any additional configurations or customizations made by app developers. The described flow provides a general understanding of the process that occurs when a user clicks on a link, particularly in the context of deep linking and app-to-app linking.

## Use cases

The Verifiable Link files are required in various use cases where seamless navigation and communication between mobile apps and associated websites or other apps are desired. Here are some potential use cases:

1. Deep Linking: Deep linking allows users to navigate directly to specific content within a mobile app from an external source, such as a website or another app. The Verifiable Link Files play a crucial role in enabling deep linking functionality. They verify the association between the app and the external source, allowing the app to handle deep links and open specific screens or content within the app when triggered.

1. FIDO and Passkey: Verifiable Link files are used to establish connections and enable seamless navigation between mobile apps and associated websites or other apps. These files verify the association between apps and external sources, facilitating deep linking and app-to-app communication.

1. App-to-App Communication: In scenarios where multiple apps need to communicate with each other, the Verifiable Link files come into play. By establishing associations between apps, these files enable seamless app-to-app communication. For example, one app might need to pass data or trigger actions in another app. The linking files ensure that the communication is secure and authorized between the involved apps.

1. Universal Links (iOS): Universal Links, facilitated by the `apple-app-site-association` file, provide a seamless transition from a website to an associated iOS app. Use cases for Universal Links include scenarios where an app provides enhanced functionality or a personalized experience compared to the website. When a user taps on a Universal Link on the website, the associated app is opened directly, enhancing user engagement and interaction.

1. Android App Links (Android): Android App Links, established through the `assetlinks.json` file, enable a similar seamless transition from a website to the associated Android app. This can be useful in scenarios where the app offers a richer user experience or additional features compared to the website. Users can navigate directly to the app, bypassing the app chooser dialog and improving the overall user journey.

1. Single Sign-On (SSO): Verifiable Link Files can also be used in conjunction with Single Sign-On (SSO) systems. When a user signs in to a website or one app, the linking files can verify the association with other apps, enabling automatic authentication and access without the need for additional login credentials. This streamlines the user experience and reduces friction in multi-app ecosystems.

1. Personalization and User Engagement: Verifiable Link Files can be utilized to personalize the user experience based on user preferences and app usage. By establishing connections between apps and associated websites, relevant content and information can be seamlessly presented to users across different platforms. This enhances user engagement and encourages app adoption.

These are just a few examples of potential use cases where the Verifiable Link Files are required to enable seamless navigation, app-to-app communication, deep linking, and personalized experiences on mobile platforms. The files serve as critical components in creating integrated and interconnected digital experiences for users across different mobile apps and platforms.

## Set up Verifiable Links in IBM Security Verify
The section describes the steps to publish the `assetlinks.json` and `apple-app-site-association` files at the `https://<your-tenant>/.well-known` endpoint.

### Pre-requisite
You need access to an IBM Security Verify (ISV) tenant and the permission to configure an API client. If you don't have access to an ISV tenant, you can start your trail [here](https://www.ibm.com/products/verify-identity). 

The API to configure Verifiable Links is currently protected by a feature flag. Contact IBM support to enable it for your tenant(s).

You should also be familiar with `curl` or an API client like "Thunder Client".

### Configure API client
1. Login to your tenant as an administrator.
1. From the sidebar menu: `Security` --> `API access`
1. Click `Add API client`

<img src="../assets/images/isv_api_access.png" alt="IBM Security Verify | API access" width="auto" height="auto">

4. Select the entitlement `Manage verifiable links configuration`
1. Click `Next` until you reach the `Confirm configuration` screen
1. Give your API client a name, e.g. `Verifiable Links` and select `Create API client`
1. Back on the initial screen, click on the context menu of your newly created API client and select `Connection details`
1. Take note of the `Client ID` and `Client secret`

### Get an access token
`Client ID` and `Client secret` get exchanged for an `openid` token:

```
curl  -X POST \
  'https://<your-tenant>/v1.0/endpoint/default/token' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'client_id=<your-client-id>' \
  --data-urlencode 'client_secret=<your-client-secret>' \
  --data-urlencode 'grant_type=client_credentials' \
  --data-urlencode 'scope=openid'
```

The response contains `access_token` attribute, which is needed in the next step.

### Create or update verifiable link files
The access token obtained in the previous step is used to authorize API requests to create and update `assetlinks.json` and `appple-app-site-association` files.

#### Google
The `data` body contains the _complete_ `assetlinks.json` file. Its content depends on the current use case, but needs to be compliant with the format described [here](https://github.com/google/digitalassetlinks/blob/master/well-known/details.md).

The following `data` is an example, typically used in `FIDO` and `App Links` scenarios: 

```
curl  -X PUT \
  'https://<your-tenant>/v1.0/verify/.well-known/assetlinks.json' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer <access_token>' \
  --data-raw '[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.get_login_creds"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "<your-app-package-name>",
      "sha256_cert_fingerprints": [
        "sha256-hash-of-signing-key"
      ]
    }
  }
]'
```

A successful request returns with `HTTP 204`.

Due to the disruptive impact that a false configuration could have on current deployments, a convenient way to revert to a previous version of the file is provided.

The `history` endpoint returns the last 5 versions that have been uploaded:
```
curl  -X GET \
  'https://<your-tenant>/v1.0/verify/.well-known/history/assetlinks.json' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer <access_token>' \
```
The response is an array with the file content in the `datafile` attribute:

```
[
  {
    "datafile": [
      {
        "relation": [
          "delegate_permission/common.handle_all_urls",
          "delegate_permission/common.get_login_creds"
        ],
        "target": {
          "namespace": "android_app",
          "package_name": "<your-app-package-name>",
          "sha256_cert_fingerprints": [
            "sha256-hash-of-signing-key"
          ]
        }
      }
    ],
    "filetype": "assetlinks.json",
    "created": 1701691777271,
    "hostname": "<your-tenant>",
    "tenantUuid": "<your-tenant-uuid>"
  }
]
```

To revert to a previous version, the file content needs to be resubmitted with a `PUT` request as described.


#### Apple
The format for the `apple-app-site-association` file is described [here](https://developer.apple.com/documentation/xcode/supporting-associated-domains).

Apart from the format and Apple specific naming, the request is very similar to the one for Google:

```
curl  -X PUT \
  'https://<your-tenant>/v1.0/verify/.well-known/apple-app-site-association' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer <access_token>' \
  --data-raw '{
        "applinks": {
            "details": [
            {
                "appID": "<your-apple-app-id>",
                "paths": [
                "/yourpath/*"
                ]
            }
            ],
            "apps": []
        },
        "webcredentials": {
            "apps": [
            "<your-apple-app-id>"
            ]
        }
    }'
```

A successful request returns with `HTTP 204`.

The file history can be obtained with:
```
curl  -X GET \
  'https://<your-tenant>/v1.0/verify/.well-known/history/apple-app-site-association' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer <access_token>' \
```

### Public access
The steps outlined will make the files available at
- `https://<your-tenant>/.well-known/assetlinks.json`
- `https://<your-tenant>/.well-known/apple-app-site-association`

A successful response will return with `HTTP 200` and include the `Content-Type: application/json` header in the response.

### Troubleshooting
1. Google provides a [Statement List Generator and Tester](https://developers.google.com/digital-asset-links/tools/generator) that can be used to validate the content and the accessibility of the `assetlinks.json` file.
1. Errors from API calls to IBM Security Verify are most likely related to one of the following reasons:
    - access token is invalid or expired
    - insufficient entitlement of the API client
    - feature flag not enabled 

## Wrapping up
`assetlinks.json` and `apple-app-site-association` files are critical components for seamless app-to-web integration on Android and iOS platforms, respectively.These files act as a foundational layer for establishing trust between your app and website, contributing to a heightened level of security for your entire ecosystem. As users navigate between web and app environments, the presence of these files ensures a seamless transition, enhancing overall user engagement.

---


_"There is never enough time to do it right,<br/>but there is always enough time to fix or to do it over."_
<br/><br/>
Daniel T. Barry
{: style="text-align: center;"}