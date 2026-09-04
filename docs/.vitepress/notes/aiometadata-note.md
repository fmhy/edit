#### AIOMetadata Note

AIOMetadata uses a stable UUID-based manifest URL — meaning AIOStreams will cache its responses against the same URL regardless of config changes, so updates in AIOMetadata may not reflect immediately. It also adds an unnecessary extra hop for every metadata/catalog request.

If you do want it within AIOStreams, add it as a Custom Addon and put it at the top of your addon list. After any AIOMetadata config change that alters the manifest, refresh your catalogs and reinstall AIOStreams.