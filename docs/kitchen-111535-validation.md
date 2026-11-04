# AB 111535

Source: `frontend/public/pdfs/AB 670 111535.pdf` and the supplied ten-row Excel screenshot.
Local kitchen: `/kitchens/ab-111535`; contracts `670111535` and `111111535`.

| NR | Catalog article | Component | Included |
| --- | --- | --- | --- |
| 1 | SP80 | sink-base | Yes |
| 2 | PLS60 | worktop | Yes |
| 3 | US90 + attached UPK10 | base-module-1 | Yes |
| 4 | A-EGSPV597210 + TGV60 | dishwasher-base | No |
| 5 | Side panel included in PLS60 | worktop (no separate item) | Yes |
| 6 | U80 | base-module-2 | Yes |
| 7 | H9002 + attached HPK2002 | wall-cabinet-1 | No |
| 8 | H8002 | wall-cabinet-2 | No |
| 9 | H6002 | wall-cabinet-3 | No |
| 10 | H8002 | wall-cabinet-4 | No |

Row 5 contains DEFAULT without an article. The user confirmed that its exposed
side panel belongs to the worktop, so it has no independent order/default row.
WU16 remains the physical replacement code for the claim-only worktop panel.
SP80, PLS60, WU16 and U80 were
missing from the local article catalog and are created by the seed if absent.
Existing catalog entries are preserved.

Exactly four order assemblies are locked at zero cost: SP80, PLS60, US90 and U80.
The sink and faucet remain claim-only parts of SP80.
The standard sink/faucet replacement codes are 526335 and 517720. The plan has
no oven, hob, refrigerator or hood; none are added. Row 6 is U80, as confirmed
by the user: a new catalog article named "Lower Cabinet 80 cm" / "Unterschrank
80 cm", without a drawer. It is independent of the existing US80 article.
Optional prices follow the
existing catalog: dishwasher EUR 579; H9002 EUR 203 + HPK2002 EUR 35;
H8002 EUR 200 each; H6002 EUR 149. Included UPK10 stays zero cost.

The vector plan and all selection polygons use the original 842 x 595 page
coordinates. Lower fronts include their drawn plinth to y=507.28. The left
UPK10 and HPK2002 strips belong to their adjacent cabinets. The thin worktop
side at x=395.64..398.28 is included. Dishwasher basket and GS details have
separate persistent light-grey clips. Both worktop views are split for claims
using the actual PLS60 article, while remaining one order item.

Validation: 14/14 active local items have MATCHED catalog links (9 order components
plus 3 accessories and 2 services). The historical standalone panel row is
inactive to preserve any existing order references. The new kitchen tests cover defaults, article
mapping, callouts, unchanged polygon bounds after geometry preparation, order
preview loading, claim splits and attached fillers. The summary shows four
default components and synchronized plan/catalog selection inside the CAD lines.
The final Next build and all 8 tests for AB 111535/111539 pass. The broader
catalog/claim suites pass 169 of 175 tests; the same six failing tests were
reproduced against the unchanged HEAD sources in an isolated baseline copy.
The service-claim contract endpoint returns HTTP 200 and the expected SP80,
sink/faucet and PLS60 claim choices.
No push or deployment was performed.

Display adjustment: the return area x=571.68..621.72, y=360.76..507.28 in the
right elevation has no selection overlay, so it always remains white. The
source drawing, adjacent U80 cabinet and included-panel data are preserved.

Built-in sink claim selection: the SP80 assembly draws a tagged faucet but no
sink bowl. The claim mapper now projects the sink onto the measured worktop
band above SP80 (x=162..295.44, y=354.04..360.76), matching the other front
elevations. Faucet and cabinet retain independent claim targets. The regression
test first reproduced the missing sink highlight, then verified the exact band
both before and after display cropping. Verified green in the live Service page
for contract 111111535; 26 kitchen/comparison tests pass.

The thin leg beside the dishwasher at x=395.64..398.28 is the left worktop's
`worktop-end-panel-left` claim part. Its contextual choice selects
`worktop-left`. The two faces at x=481.8..535.56 remain the right worktop's
`worktop-end-panel`; selecting the right worktop does not paint the left leg.
These are claim-only splits of the same included worktop order item.

Catalog audit: all 14 active kitchen items have valid, active MATCHED catalog
references. The 4 included items stay zero-priced; optional item prices match
the IP 2200 catalog, including HPK2002. US90 is linked to UPK10 and U80 is a
separate article from US80. All 10 active claim parts resolve to active kitchen
sources. Both contract mappings are active. The retired panel row is inactive.

The audit found and filled missing IP 2200 program records for SP80, PLS60, U80
and UPK10, preserving existing supplier prices. The kitchen seed now opts into
program registration for future imports. Re-audit: 14/14 catalog-linked and
14/14 program-linked, no mismatches. Populated dimensions match the catalog;
some catalog dimensions are unspecified (for example worktop cut length and
dishwasher height/depth). Twenty relevant kitchen/comparison tests pass.
