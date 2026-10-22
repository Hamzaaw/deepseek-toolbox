# Privacy

DeepSeek Toolbox v1.0.2 keeps folders, chat-to-folder assignments, saved prompts, chains, bookmarks, settings, an installation ID and cached membership status in `chrome.storage.local`. Daily feature counters use the DeepSeek site's `localStorage`. These are browser-profile data, not cloud sync. Bookmark records include a message excerpt, conversation title and ID.

## Network requests

- **Membership:** `https://deepseek-api.hamzaw.com/me` receives the installation ID and a client marker to look up existing membership. Current tools are free regardless of the result. Ordinary browser requests also expose network metadata such as your IP address to the receiving service.
- **Enhancement:** clicking Enhance sends the current draft to `https://claude-api.hamzaw.com/api/claude/enhance`. This optional hosted service may use an AI provider. Its implementation and server retention practices are outside this repository. Do not send sensitive drafts if you are not comfortable with external processing. You can hide Enhance in Settings.
- **Bulk deletion:** selected conversation IDs are sent to DeepSeek's own deletion API using your existing DeepSeek session. This deletes the selected conversations from your account after confirmation.
- **Feedback:** the feedback button opens an email draft to `hamzaw31@gmail.com` containing your feedback, extension version, browser user agent and timestamp. Your email app controls whether it is sent.
- **Uninstall survey:** the extension registers a Google Forms survey URL that may open after uninstall. Submitting the form is optional.

The extension retains client methods for the hosted customer portal and membership recovery. Those methods can send an installation ID and, for recovery, the email supplied by the caller. There is no new-checkout offer in this release; checkout creation is disabled in the extension. Account and payment records are held by the private service, not in this repository.

Local exports are downloaded to your device or opened in a print view. The export operation does not send the conversation to the Toolbox service. Normal DeepSeek chat traffic is governed by DeepSeek's own policies.

## Existing installations

This release does not clear saved data, change installation IDs, cancel purchases or log users out. Removing the extension or loading a separate unpacked copy can remove or separate its browser storage. Keep the same installation when updating.

## Contact

For privacy questions or a private security report, email `hamzaw31@gmail.com`. Please do not put credentials, personal chat content or customer records in public issues.
