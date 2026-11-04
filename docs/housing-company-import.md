# Importimi i Housing Companies dhe lidhja e kontratave

Skripti: `frontend/scripts/import-housing-companies.cjs`.

Burimi i kompanive dhe kodeve është sheet-i i parë i
`VETEM_SHEET_1_HOUSING_COMPANIES_KUZHINAT.xlsx` në rrënjën e projektit.
Ndarja e kodeve sipas objekteve merret nga fotoja e dhënë:

| Kompania | Objekti | Kode AB |
| --- | --- | ---: |
| HBI Hausbau-Immobiliengesellschaft mbH | Hof A | 65 |
| HBI Hausbau-Immobiliengesellschaft mbH | Hof B | 49 |
| ARGE Nördliche Riedsiedlung | Haus 1 | 14 |
| ARGE Nördliche Riedsiedlung | Haus 2 | 14 |
| ARGE Nördliche Riedsiedlung | Haus 3 | 17 |
| ARGE Nördliche Riedsiedlung | Haus 4 | 14 |
| ARGE Nördliche Riedsiedlung | Haus 5 | 14 |
| ARGE Nördliche Riedsiedlung | Haus 6 | 16 |
| ARGE Nördliche Riedsiedlung | Haus 7 | 12 |
| ARGE Nördliche Riedsiedlung | Haus 8 | 12 |
| ARGE Nördliche Riedsiedlung | Haus 9 | 18 |
| SAGA Siedlungs-Aktiengesellschaft Hamburg | Saga | 9 |
| Monika Wach | Diverse | 2 |
| S-Immobiliengesellschaft Holstein mbH & Co.KG | Diverse | 1 |
| **Gjithsej** | **14 objekte / 5 kompani** | **257** |

Lidhja është `HousingCompany → PropertyObject → Project → KitchenContract → Kitchen`.
Çdo objekt ka një projekt për lidhjet e kontratave, sipas skemës ekzistuese.
Dy objektet `Diverse` i përkasin kompanive të ndryshme.

Nga dosja `frontend`, parapamja pa ndryshuar databazën:

```powershell
npm run import:housing-companies -- --report=../tmp/housing-company-db-plan.json
```

Për të ruajtur kompanitë dhe lidhjet në databazën e konfiguruar me `DATABASE_URL`:

```powershell
npm run import:housing-companies -- --apply --report=../tmp/housing-company-apply-plan.json
```

Validimi i Excel-it pa lidhje me databazën:

```powershell
npm run import:housing-companies -- --offline
```

`--input=<file.xlsx>` përdor një kopje tjetër të Excel-it me të njëjtët headers.
Kolona `Store Address` dhe adresa për secilën kompani janë të detyrueshme;
burimet me adresa bosh refuzohen para çdo shkrimi.
Dosja e raportit duhet të ekzistojë. `--report` ruan planin para ekzekutimit,
përfshirë `previousProjectId`, lidhjet e synuara, numrat që mungojnë dhe
`previousAddress` / `address` / `addressAction` për secilën kompani.
Terminali afishon `companyAddressChanges`; `updateCompanyAddresses` numëron
adresat e kompanive ekzistuese që do të përditësohen.
Në fund të `--apply`, përmbledhja e verifikimit afishohet në terminal.

Për çdo AB kontrollohen numrat `111` + kodi dhe `670` + kodi. Për shembull,
`AB-104332` lidhet me `111104332` dhe `670104332`, nëse ekzistojnë.
Prapashtesat e Haus 3 ruhen në raport: `AB-105759-56` nuk është interval.
Për këtë kod kontrollohen `670105759`, `67010575956` dhe `670105759-56`
(edhe variantet me `111`). Nëse ekziston më shumë se një variant për të njëjtin
prefiks, importimi ndalet për sqarimin e dykuptimësisë.
Nuk shtohet `AB-105773`, i cili mungon në burim.

Krijohen vetëm kompanitë, objektet dhe projektet që mungojnë. Kontratat ekzistuese
lidhen ose rilidhen sipas burimit; ndryshohet vetëm `projectId`.
Kontratat dhe kuzhinat që mungojnë nuk krijohen. Për kuzhinat reale, të gjitha
kontratat lidhen sipas kodit të kuzhinës në Excel, pavarësisht numrit/prefiksit.
Kjo përfshin `222…` dhe `670111111` të kuzhinës `ab-105808` (ARGE / Haus 6).
Vetëm kontratat pa përputhje me numër ose me kod kuzhine mbeten të paprekura.
Raporti dhe terminali tregojnë `unmatchedContracts`, `missingContracts` (në
terminal), dhe `remainingWithoutCompany` (pas një aplikimi të suksesshëm).
Kodet kundërthënëse të slug/kitchenCode ndalojnë importimin.
Kontratat ARC me kuzhinën e përbashkët `pdf-only-kitchen` përputhen vetëm nga numri,
pa propaguar kompaninë ndërmjet tyre, dhe mbështeten pa ndryshuar
llojin ose kuzhinën e tyre. Për kontratat e tjera kontrollohet përputhja e kuzhinës
me kodin AB; mospërputhjet ndalojnë importimin.

`Store Address` ruhet te `HousingCompany.address`, si adresë postare e kompanisë.
Kompanitë e reja krijohen me adresë; për kompanitë ekzistuese, adresa përditësohet
sipas Excel-it. Email-i, telefoni dhe shënimet ekzistuese ruhen.

| Kompania | Adresa e kompanisë |
| --- | --- |
| HBI Hausbau-Immobiliengesellschaft mbH | Schwansburg 8, D 21614 Buxtehude |
| ARGE Nördliche Riedsiedlung | c/o MBN GmbH, Beekebreite 2-8, D 49124 Georgsmarienhütte |
| SAGA Siedlungs-Aktiengesellschaft Hamburg | Poppenhusenstr. 2, D 22305 Hamburg |
| S-Immobiliengesellschaft Holstein mbH & Co.KG | Hagenstraße 19, 23843 Bad Oldesloe |
| Monika Wach | Erich-Kästner-Ring 63, D 22175 Hamburg |

Adresa e kompanisë shfaqet te `/admin/property-owners`, në kolonën Company address,
te fusha Address në faqen e kompanisë dhe në eksportin Excel. Kolona Contact
shfaq email-in dhe telefonin. Vendndodhjet e objekteve nuk shfaqen si kolonë më vete
në këtë listë; adresat e tyre menaxhohen brenda kompanisë.
Numërimi i kontratave për kompani, objekte dhe projekte përjashton prefiksin `111`,
edhe kur numri përmban hapësira. Kjo vlen edhe për totalet në API dhe eksportin e
kompanive. Kontratat `111` vazhdojnë të jenë të lidhura me kompanitë e tyre.
Nuk kopjohet te objektet, kuzhinat ose adresat e porosive. Objektet e reja krijohen
pa adresë; adresat e objekteve ekzistuese nuk ndryshohen. Pas rilidhjes,
formularët që marrin adresën nga projekti lexojnë objektin e ri. Për shembull,
formulari i service claims përdor porosinë e fundit kur objekti nuk ka adresë,
ose lë adresën bosh kur nuk ka as porosi. Adresat e objekteve duhen plotësuar veçmas.

Shkrimet bëhen në një transaksion serializable me verifikim përfundimtar.
Një ndryshim konkurrues i adresës së kompanisë ose lidhjes së kontratës e ndalon
importimin dhe transaksioni kthehet mbrapsht.
Ekzekutimi i përsëritur nuk krijon dublikate. Kompanitë/objektet me emra të dyfishtë,
projektet jokonsistente dhe përputhjet e paqarta raportohen si konflikte.

Seed-i i kuzhinave është ndryshuar që të ruajë lidhjet e kompanive/projekteve.
Ai nuk fshin më kompanitë jo-ARGE, nuk krijon më automatikisht kompaninë/projektin
e vjetër dhe nuk i mbledh kontratat te projekti Hamburg. Kontratat e reja nga
seed-i mbeten pa projekt derisa të ekzekutohet importimi ose të lidhen nga admini.
Komanda e vjetër `cleanup:housing-seed` mbetet një pastrim destruktiv për të dhënat
demo dhe nuk është pjesë e këtij importimi; ajo fshin edhe kompani jo-ARGE.

Parapamja e vjetër më 2026-11-02 në databazën e konfiguruar (jo rezultati
aktual i serverit) gjeti:
4 kompani për t'u krijuar, 14 objekte/projekte për t'u krijuar, 39 kontrata
për t'u rilidhur, 475 numra kontratash të mundshëm që mungojnë dhe 0 konflikte.
Këto janë rezultate të leximit të databazës; nuk është ekzekutuar `--apply`.
257 kode AB japin 514 kontrolle me dy prefikset, jo 514 kuzhina të ndryshme.

Kontrolli vetëm me lexim në server më 2026-11-02 gjeti 602 kontrata. Me rregullin
e lidhjes sipas kuzhinës, 599 përputhen: 228 lidhje të reja dhe 371 rilidhje.
Krijohen 4 kompani, 14 objekte dhe 14 projekte. Tri kontratat `111103898`,
`670103898`, `222103898` mbeten te ARGE / Hamburg: kodi `103898` mungon në Excel.
Nuk mbetet kontratë ekzistuese pa kompani në atë gjendje të të dhënave.
Mungojnë `111111535` dhe `670111535` për SAGA / AB-111535; nuk krijohen nga importi.
Këto janë rezultate të kontrollit, jo konfirmim aplikimi. Raportet e vjetra në
`tmp/housing-company-*` janë historike dhe duhen rigjeneruar për një ekzekutim të ri.

## Aplikimi lokal më 2026-11-04

Importimi u aplikua vetëm në databazën `localhost`, pas ruajtjes së gjendjes së
mëparshme në `frontend/.local-data/housing-company-import/`. U krijuan 4 kompani,
14 objekte dhe 14 projekte; u përditësua adresa e ARGE-së dhe u ruajtën të pesë
adresat e kompanive nga tabela. U lidhën 228 kontrata dhe u rilidhën 287.
Nga 538 kontrata ekzistuese, 515 përputhen me burimin dhe 23 mbetën të paprekura;
19 nga këto mbeten pa kompani. Dy numra të pritshëm kontratash mungojnë dhe
nuk u krijuan. Ekzekutimi i dytë konfirmoi zero ndryshime të tjera.
U verifikua që kontaktet, adresat e objekteve ekzistuese dhe fushat e kontratave
përveç `projectId` mbetën të pandryshuara. Kjo nuk konfirmon aplikim në server.

Testet:

```powershell
node --test test/housing-company-import.test.cjs
```
