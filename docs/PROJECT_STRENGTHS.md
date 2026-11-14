# Why LUNARIS stands out

**An evidence-based case for the project by Parsec Studio.**

LUNARIS deserves consideration because it turns scientific ideas into decisions players can make and test. Across four controllable missions, learners handle water recovery, protection, communication delay and rover energy, then connect their actions to explanations and questions. Variable mission conditions support repeated practice. Browser access, English and Russian, keyboard and touch controls, and an offline edition reduce barriers to trying the game. Parsec Studio combines this playable experience with traceable NASA resources, public source code and automated checks of mission mechanics.

## Strengths and evidence

| Strength | What is present in the project | Evidence |
| --- | --- | --- |
| Learning through action | Four controllable expeditions connect a physical task with feedback, an explanation and a knowledge check. | [Gameplay captures](../README.md#actual-gameplay), [seven-slide demo](../demo/LUNARIS-Demo.pdf), [playable mission logic](../js/academy-play.js) |
| Decisions with consequences | Water follows a process order and flow budget; shielding has mass and coverage constraints; communication includes a real reply delay; rover travel requires a return reserve. | [Mission checks](../tests/academy-play.test.cjs), [instrument checks](../tests/v6-challenges.test.cjs) |
| Repeatable practice | Seeded layouts, shielding budgets, communication distances, sample positions and quiz choices vary. | [Scenario generation](../js/academy.js), [generated-case checks](../tests/academy-play.test.cjs) |
| Accessible delivery | A browser game, English/Russian interfaces, keyboard/touch input and a self-contained offline edition. | [Live game](https://parsec.kz/lunaris/), [offline HTML](../LUNARIS-Play.html), [boot and navigation checks](../tests/boot.test.cjs) |
| Traceable scientific basis | Nine NASA resources are linked to their uses in the educational explanations. | [NASA source mapping](NASA_SOURCES.md) |
| Reviewable implementation | Public source, reproducible tests, artwork provenance and a seven-slide presentation with actual gameplay. | [Development checks](DEVELOPMENT.md), [artwork provenance](ARTWORK.md), [demo](../demo/LUNARIS-Demo.pdf) |

## Original contribution and team

The original LUNARIS concept and creative direction belong to Parsec Studio: Meiirzhan Issa and Zhasulan Zholdas. Its contribution to the challenge is the combination of a stranded-engineer story, connected outpost resources, practical science tasks and follow-up explanations. This claim concerns the team's approach to the challenge, not ownership of NASA's scientific concepts or the general idea of an astronaut trainer. [Team credits](../AUTHORS.md) and [tool assistance](AI_DISCLOSURE.md) document these contributions separately.

## Verification and practical limits

The playable-academy and instrument suites pass 15 and 7 tests respectively. They include 1,000 generated rover round trips with a safe route and return reserve, checks of valid shielding budgets, and generated flow, panel, signal and drilling configurations. These checks support the mechanics and scenario generation; they do not measure teaching effectiveness in a classroom.

The current release is a working educational game. Classroom learning outcomes, long-term engagement and comparisons with other entries have not been measured. The project uses simplified teaching models and educational NASA references rather than live operational data. Its case for recognition rests on the playable experience and evidence above.
