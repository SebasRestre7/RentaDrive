# Test-only QR pixel decoder

This vendored CommonJS bundle exists only so the browser smoke test can detect and decode the actual rendered confirmation PNG. Windows Chrome in this harness exposes no BarcodeDetector. The application has no decoder dependency.

| Source | Version | License | npm tarball SHA-1 |
| --- | --- | --- | --- |
| @nuintun/qrcode | 5.0.3 | MIT | 8103a093af137bd0e410ecd2dda8238660fb6e32 |
| tslib | 2.8.1 | 0BSD | 612efe4ed235d567e8aba5f2a5fab70280ade83f |

The bundle contains the decoder, detector and binarizer CommonJS dependency graph (43 modules), with internal require references resolved to bundle module IDs. No encoder is bundled. Upstream source headers, licenses and tslib copyright notice are retained in adjacent files. No runtime package installation is needed to run the test. Sources: https://github.com/nuintun/qrcode and https://github.com/microsoft/tslib.
