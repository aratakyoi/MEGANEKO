---
status: draft
updated: 2026-11-08
---

# Design brief: MEGANEKO / メガネコ

This consolidates Arata's design decisions from the project conversation using the Devpost Learn `plan-lens` template. The initial concept and implementation brief preceded the prototype; this four-character revision was written after that prototype and before final asset integration. It is not a claim that this exact document existed before the first code. Final presentation and device feel remain for Arata to review.

## The one spatial moment
Two willing participants notice that their floating, glasses-wearing cat companions match. They agree to fuse, bring their right hands together, and see the cats glow, meet, and separate into two independently drawn new companions—one for each person. “Thank you” becomes a reason to start a conversation.

## Why it belongs on glasses
- Uses: draws in the world and leaves the user's eyes up and hands available between interactions.
- The cats belong beside people in shared space. The meeting and greeting are the activity; a phone screen would pull attention away from the other person.
- This prototype does not rely on recognizing faces or filming bystanders.

## Product or overlay
- Type: product; the virtual companions and their collection are the experience.
- Real version senses: participating users' shared-session head and right-hand poses after joining and aligning the same shared space. Hand proximity, orientation and continuous dwell estimate a greeting; they do not prove physical contact.
- Preview stand-in, explicitly requested by Arata: a simulated other participant and simulated approaching hands. The interface labels this PREVIEW SIMULATION. Consent, matching, timing, visual response, independent draws and collection updates still run through game logic.

## Where things live
- Look toward the other participant and the space between the companions during fusion.
- Companion: a small floating cat in front and to the side. Current camera-relative offset is 17 cm right, 6 cm up and 95 cm forward (default). Smoothed follow avoids a rigid face-attached object; real comfort remains unproven.
- Source characters: 18 cm tall, centered origins, with a shared display scale of 0.65 (default). The live companions remain floating while a text collection opens.
- Fusion effects: converge between the two cats and separate toward their owners. The four-card collection appears only on request. Odds remain documented here.

## Hands and input
- Fuse / Agree: large UIKit controls, one explicit consent per participant.
- The requested real action is a handshake. Default heuristic: fresh right-hand poses, palms within 12 cm for 0.8 seconds, acceptable orientation, head separation at most 160 cm; release at least 25 cm before another fusion. These defaults require real-device tuning.
- Preview controls: N creates a matching simulated encounter; F requests, F again simulates the other participant's consent; H approaches or separates simulated hands. These simulation keys remain hidden developer controls.
- Collection is the only persistent home action. Meet is a contextual setup action on home; Fuse replaces it for a fresh matching peer. Collection contains four 2×2 model cards and Back only: owned species use their actual animated prefab, unowned species use a dark locked silhouette. Names, rarity, and counts sit below each thumbnail. Back destroys thumbnails without changing the profile or equipped companion.
- Targets are big and highlight when aimed at.
- Voice: none.

## When things show
- Detective and Princess remain the established mascots and final icon subjects. There is no title or mode-selection screen in the play flow.
- The local companion appears immediately. StartMode.Off leaves session initialization to explicit Meet. Home is a 28 cm compact name chip and action bar.
- Consent feedback appears when a fusion is requested; cancel and loss of valid tracking prevent completion.
- The glow and particles last only through fusion and reveal. The caption is “A New MEGANEKO Is Born!”
- Music starts muted; only hidden editor controls can enable it. No continuous sound should be left playing after work.

## Four-character scope and collection
| Character | Rarity | Probability |
|---|---|---:|
| Gentle MegaNeko | Normal | 40% |
| Detective MegaNeko | Normal | 40% |
| Princess MegaNeko | Rare | 18% |
| Queen MegaNeko | Ultra Rare | 2% |

Names and tiers are Arata's decisions. The 80/18/2 tier distribution is an adjustable default. More characters are planned after the hackathon.

Initial assignment and each participant's fusion result use the same pool. Results are independent: they may match or differ, and previously found cats remain eligible. A new active companion does not remove its predecessor's collection record. Duplicate counts upgrade the frame: Basic, Bronze, Silver, Prismatic, then Gold at five acquisitions. Gold is a collection frame, not an undocumented change to the supplied character texture. Queen-to-Queen fusion does not guarantee Queen.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Start the experience and see one of the four supplied characters with its correct name and a working idle animation.
2. Enter the clearly labeled simulation, create a matching participant, and observe that fusion needs both consents and sustained simulated hand proximity.
3. Complete the greeting and see the glow, particles, two resulting companions and updated active companion without a duplicate reward from holding the hands together.
4. Open the four-entry 2x2 collection and return with Back three times; names, rarity and counts retain prior acquisitions.
5. Verify all four final rigged models and their Idle/Celebrate animations in LEAF; retain the published probabilities without changing live random outcomes or collection records.

## Out of scope
- Automatic discovery of strangers across the city. The implemented shared mode requires voluntary participation in the same shared session and aligned space.
- Recording, identifying or tracking bystanders.
- Seven or twenty species in this hackathon build; old records are preserved separately, not remapped into the four-character collection.
- Purchases or paid randomized rewards.
- Claiming physical handshake accuracy, outdoor tracking or two-device comfort based on a laptop simulation.

## Risks and open questions
- Arata wants the handshake to remain central. This cannot be physically verified without two devices; the preview demonstrates the response using an explicit stand-in. Feel unproven.
- Device hand-tracking loss, shared alignment, latency and long-session comfort require hardware testing.
- Generated single-view assets can contain minor underside/detail imperfections. Use restrained skeletal movement and inspect the exported assets, not only the source render.
- Uncommon companions may make matching meetings infrequent. The submitted rules retain Arata's matching requirement; event boosts and matchmaking are future ideas, not silently added rules.
- Read the final evidence report for actual test results. A criterion listed here is not itself evidence of completion.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources

## Simple UI final revision
Sender sees waiting feedback and Cancel; only the receiving participant sees Agree. Both consents and the handshake gate precede fusion, result, and automatic Home. Simulation is labelled only while active. Connection failures stay inline with home Meet retry; the kit menu remains disabled. No prepareOfflineMode is used. Real two-device joining, alignment, physical handshake and performance remain unverified.

