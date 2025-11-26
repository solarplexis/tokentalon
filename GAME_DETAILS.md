# Game Details

1. The canvas background of the game should be the /assets/images/backgrounds/arcade_background.jpg
2. The game cabinet should be the /assets/images/cabinet/claw_matchine_enclosure.png
  A. I can create a cabinet.json file that specifies the enclosure boundaries for the claw if necessary
    i. This will also need the dimensions of the drop box that is inside the enclosure (i.e. not the prize dispenser)
  B. The claw needs to be scaled accordinglhy
3. The claw must be able to move side-to-side, front-to-back and scale accordingly
4. the 'prizes' are listed in assets/images/prizes. The enclosure should be populated with several prizes that look randomly layered and distributed inside the enclosure, but not within the drop box
5. The claw's grabbing action should begin when it does hit collision on one of the objects in the enclosure (i.e. not before)
6. As per the PROJECT_PLANNING.md and PROJECT_PLAN.md, we want to add unique characteristics on the successuful prize grab. We don't need to display those attributes in the claw machine, but we do want to show them in the prize overlay and obviously need to track them as part of the NFT.
  A. Let's start by adding custom attributes to the prize on the Congratulations overlay