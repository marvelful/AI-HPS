# AI-HPS Mock Hospital Navigation Dataset

This dataset simulates hospital navigation for the AI-HPS chatbot because the official hospital map was not available. It is not an official plan of Douala General Hospital. It is designed for demonstration, testing, and thesis explanation.

Map file: `docs/mock-hospital-navigation-map.svg`

## Simulated Layout

- Main Entrance Door is beside Dermatology.
- From Dermatology, the patient goes down the Valley Walkway to the Main Gate Junction.
- From the Main Gate Junction, the left wing leads to Pediatrics, Gynecology and Obstetrics, and Maternity.
- From the Main Gate Junction, the right wing leads to Emergency, Consultations, Surgery, Hemodialysis, Blood Bank, ICU, Radiology, and the Operating Block.
- Reception, Pharmacy, Cashier, Administration, and Laboratory are placed around the central access corridor.

## Main Demo Landmarks

| Landmark | Simulated Zone | Common User Names |
|---|---|---|
| Main Entrance Door | Entrance | main entrance, front door, hospital entrance |
| Dermatology | Entrance | dermatology, skin clinic |
| Main Gate Junction | Central access | main gate, gate, central junction |
| Reception / Information Desk | Central access | reception, information desk, help desk |
| Laboratory | Central access | laboratory, lab |
| Pharmacy | Central access | pharmacy, medicine counter |
| Cashier / Billing | Central access | cashier, billing, payment |
| Pediatrics | Left wing | pediatrics, paediatrics, children ward |
| Gynecology and Obstetrics | Left wing | gynecology, gynaecology, obstetrics |
| Maternity | Left wing | maternity, labour ward, delivery ward |
| Emergency Department | Right wing | emergency, urgences, ER |
| Consultations | Right wing | consultations, outpatient clinic |
| Surgery | Right wing | surgery, surgical service |
| Operating Block | Right wing | operating block, bloc operatoire, theatre |
| ICU / Reanimation | Right wing | ICU, intensive care, reanimation |
| Hemodialysis | Right wing | hemodialysis, haemodialysis, dialysis |
| Blood Bank | Right wing | blood bank, bloodbank, transfusion |
| Radiology / Imaging | Right wing | radiology, imaging, x-ray, scanner |

## Example Predefined Navigation Questions

The chatbot can answer these questions using the same simulated route graph.

| Example Question | Expected Destination |
|---|---|
| I am at the main entrance and I want to go to the blood bank. | Blood Bank |
| Where is the bloodbank from the entrance door? | Blood Bank |
| I wish to go to the maternity department from the main entrance. | Maternity |
| Direct me from the main gate to maternity. | Maternity |
| I am at Dermatology. How can I reach Gynecology? | Gynecology and Obstetrics |
| I am near the Laboratory and I need Hemodialysis. | Hemodialysis |
| How do I go from Reception to the Operating Block? | Operating Block |
| Guide me from Emergency to ICU. | ICU / Reanimation |
| I want to go to Pediatrics from the front door. | Pediatrics |
| How can I reach the Consultation block from the main entrance? | Consultations |
| I am at the pharmacy, where is the cashier? | Cashier / Billing |
| How do I go from billing to administration? | Administration |
| I am at Radiology and I need the Blood Bank. | Blood Bank |
| From Surgery, direct me to the Operating Block. | Operating Block |
| I am at Surgery. Where is Hemodialysis? | Hemodialysis |
| From Consultations, how can I go to Radiology? | Radiology / Imaging |
| I am at Pediatrics and want to go to Maternity. | Maternity |
| I am at Maternity and need the Laboratory. | Laboratory |
| I am at the main gate, where is Emergency? | Emergency Department |
| I am at the main entrance and need Reception. | Reception / Information Desk |
| Je suis a l'entree principale, je veux aller a la maternite. | Maternity |
| Ou se trouve le bloc operatoire depuis l'accueil? | Operating Block |
| Je suis au laboratoire. Comment aller a la banque de sang? | Blood Bank |
| Guide-moi vers la gynecologie depuis la porte principale. | Gynecology and Obstetrics |
| Depuis les urgences, comment atteindre la reanimation? | ICU / Reanimation |
| Depuis la pharmacie, comment aller au laboratoire? | Laboratory |
| Je suis a la pediatrie, je veux aller a la gynecologie. | Gynecology and Obstetrics |
| Je suis au portail principal, dirige moi vers les consultations. | Consultations |
| Comment aller du bloc operatoire vers la reanimation? | ICU / Reanimation |
| Depuis la banque de sang, comment atteindre les urgences? | Emergency Department |

## Example Route Answer

Question: I am at the main entrance and I want to go to the blood bank.

Answer:

1. Move forward from the main entrance and keep Dermatology on your right.
2. Continue down the sloped valley walkway.
3. Follow the walkway until you reach the main gate junction.
4. At the main gate junction, take the right-side path toward Emergency.
5. Pass Emergency and continue to the Consultations block.
6. From Consultations, take the inner corridor toward Radiology / Imaging.
7. From Radiology, go upward to the Blood Bank.

Estimated walking time: about 14 minutes.

## Implementation Notes

- The route data is stored in `backend/agents/data/mock_navigation_routes.json`.
- The deterministic matcher is implemented in `backend/agents/navigation_mock.py`.
- `agent_c` checks this mock navigation layer before the normal department lookup.
- The map is served through Caddy from `/docs/mock-hospital-navigation-map.svg`.
