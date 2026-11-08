# MEGANEKO — Meet. Fuse. Connect.

MEGANEKO is a social AR companion experience for SPECS. A small, glasses-wearing cat floats beside you. Meet another willing participant with the same companion, agree to fuse, and greet each other: the cats glow, merge, and separate into two independently drawn new companions.

The goal is to turn a collectible character into a reason to say hello. Past companions remain in your collection, and repeated discoveries upgrade their display frames. The hackathon edition has four characters—Gentle, Detective, Princess and Queen—with more planned for the future.

## Why glasses?

The interesting moment happens between people, not inside a phone screen. A visible companion gives two people something to notice and talk about. The fusion effect occupies the shared space between them, while a short, deliberate greeting is the main action.

## How it was built

Arata designed the characters, collection rules and social interaction. Codex worked with Snap's CLAD tools and the Lens Studio MCP to implement the Lens. The supplied Tripo models were adjusted in Blender, given skeletal rigs and three animation clips, and prepared for Lens Studio. Spectacles Interaction Kit, UIKit and SyncKit support interaction and the shared-session implementation.

## What the demo proves

The laptop demo is explicitly labeled PREVIEW SIMULATION. A simulated participant and simulated approaching hands stand in for two people wearing glasses. It demonstrates the game flow: matching companions, mutual consent, the fusion response, independent outcomes and collection progress. The accompanying verification report records the tests actually completed.

The hardware path estimates a handshake using tracked right-hand proximity, orientation and dwell time. No SPECS devices were available, so physical handshake accuracy, outdoor alignment, comfort and two-device performance are unverified. The current shared mode requires joining the same aligned session; it is not city-wide automatic stranger discovery.

## What we learned

The important AR design decision was to preserve the social greeting while making its response demonstrable in a laptop preview. We also learned to inspect a generated model from several directions before batch production: a four-view generation attempt produced inconsistent front/back results, and Arata replaced those assets with four usable characters. Keeping models replaceable allowed the game logic to survive that change in art direction.

## Next steps

Test with two real devices, tune the greeting thresholds and companion placement, improve the shared-session onboarding, and expand the character collection. The long-term idea is a friendly reason to meet people; the submitted prototype focuses on one complete greeting-and-fusion moment.

### Tutorial shown in the preview
The app includes an automatic virtual-partner tutorial: a glasses-wearing human character and a modeled first-person right hand illustrate the greeting and fusion flow. Tutorial results are isolated from the user's collection and shared-session state. This sequence demonstrates the intended interaction; it is not footage of physical hand tracking or a verified two-device session.

