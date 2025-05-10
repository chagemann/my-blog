---
layout: single
title:  "Generating branded QR Codes with Java and ZXing"
date:   2025-05-07 22:17:21 +1000
categories: java tutorial branding
show_date: true
excerpt: QR codes are a staple in modern technology, offering a quick and convenient way to access information. In this post, we’ll explore how to enhance your QR codes by adding a logo at the center, using Java and the ZXing library. This technique ensures that your QR codes stand out, while maintaining their scannability. 
---

<img src="/assets/images/qr_ibm_icons.png" alt="IBM branded QR code" style="width: 400px; border-radius: 32px; max-width: 40%; float: right; margin-left: 1em; margin-bottom: 1em;"/> QR codes are widely used in our products for everything from onboarding, sharing links to enabling easy access to services. While they're a quick and reliable solution, they tend to look generic, which can reduce their impact, especially in marketing or branding contexts. 

By adding a logo to the center of a QR code, you can make it stand out, build brand recognition, and help users easily identify your trusted content. In this post, we'll walk through how to generate branded QR codes in Java using the ZXing library, and how to seamlessly embed your logo into the code without compromising scannability.

## Tools and Libraries

1. Java 17 (or any recent version), compatible with modern libraries.
1. [ZXing](https://github.com/zxing/zxing) as the go-to solution for generating QR codes, providing an easy way to create and manipulate QR codes. You'll need the core ZXing library (`zxing-core`) and the Java SE version (`zxing-javase`)
1. [GIMP](https://www.gimp.org/) (optional) to prepare and size your logo to fit within the QR code. I followed [this tutorial](https://www.youtube.com/watch?v=FMSdW5csDLU) to create the logos used in the demo app.

## How it works

To embed a logo in a QR code, the ZXing library is used to generate the code with a high error correction  level (`EncodeHintType.ERROR_CORRECTION = ErrorCorrectionLevel.H`). [This setting](https://zxing.github.io/zxing/apidocs/com/google/zxing/qrcode/decoder/ErrorCorrectionLevel.html) allows a portion of the QR code to be obscured without making it unreadable.

The logo is overlaid at the center of the QR code and typically sized to not exceed 20–30% of the QR area. In our demo app, we generate the QR code dynamically from input data, but you could also apply a logo to a static QR code image.

The key is to avoid blocking the QR code’s essential data regions. Once the QR code and logo are combined, the resulting image remains scannable.

## Code Walkthrough

This example keeps things simple — just enough to generate a QR code, apply a logo in the center, and export the final image as a PNG. Here’s a breakdown of the core implementation steps, each backed by GitHub Gists: 

1. Set High error correction.
{% gist chagemann/b036eb6eee71b2984dae7cf7a9710233 %}

1. Generate QR code from input data.
{% gist chagemann/172df9718e8cfb5e8c1b9b104523570e %}

1. Load an image file (the logo) from the application’s resource folder.
{% gist chagemann/e387d8868e0797ab211806dfcb397763 %}

1. Calculate 20% of the size if the QR code and center the logo.
{% gist chagemann/c2c662a0261bab71fddccb731d87e28c %}

1. Resize the logo and create new blank image with alpha channel.
{% gist chagemann/cbdb14fd024dcfca73b8b00573f9e651 %}

1. Combines the QR code and the centered logo into a single image, with smooth rendering.
{% gist chagemann/b8ac4fa2860a2d07e8aebd8a81bc0d4d %}

1. Writes the combined image to the file system.
{% gist chagemann/24249eff036bb8ba58dd1c6ac37542ff %}

## Demo app

A demo application showcasing the generation of branded QR codes is available here: [https://github.com/chagemann/Branded-QR-Codes](https://github.com/chagemann/Branded-QR-Codes)

The logo image should be placed in the `./app/src/main/resources/` directory, and the output image will be saved in the `./app` folder. Then execute it with `./gradlew build run`.

Here are two more examples of how that could look like:
<div style="text-align: center;">
<img src="/assets/images/qr_ibm_black.png" alt="IBM branded QR code" class="scaled" />
<img src="/assets/images/qr_ibm_verify.png" alt="IBM branded QR code" class="scaled" />
</div>

## Summary

Branded QR codes are a simple yet powerful enhancement that adds a layer of visual identity to an otherwise plain tool. With the help of Java and the ZXing library, it’s easy to automate their generation and integrate them into your application or service pipeline.

Whether you're improving user trust, strengthening your brand presence, or simply experimenting with custom visuals, this technique is a valuable addition to your development toolkit.

---

_"Freedom is always the freedom of those who think differently."_
<br/><br/>
-- Rosa Luxemburg
{: style="text-align: center;"}