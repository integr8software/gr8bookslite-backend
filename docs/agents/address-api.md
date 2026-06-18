# Address Reference API

The address API exposes Philippine reference address data from:

- `prisma/seed-data/region.csv`
- `prisma/seed-data/province.csv`
- `prisma/seed-data/citymunicipality.csv`
- `prisma/seed-data/barangay.csv`

The database tables use direct names instead of PSGC-prefixed names:

- `regions`
- `provinces`
- `city_municipalities`
- `barangays`

The SQL view `address_autocomplete_view` joins barangay, city/municipality, province, and region into one autocomplete row.

## Base URL

All routes are versioned:

```text
/api/v1
```

## Hierarchy Routes

```text
GET /regions/
GET /regions/{regionCode}/
GET /regions/{regionCode}/provinces/
GET /regions/{regionCode}/districts/
GET /regions/{regionCode}/cities/
GET /regions/{regionCode}/municipalities/
GET /regions/{regionCode}/cities-municipalities/
GET /regions/{regionCode}/sub-municipalities/
GET /regions/{regionCode}/barangays/

GET /provinces/
GET /provinces/{provinceCode}/
GET /provinces/{provinceCode}/cities/
GET /provinces/{provinceCode}/municipalities/
GET /provinces/{provinceCode}/cities-municipalities/
GET /provinces/{provinceCode}/sub-municipalities/
GET /provinces/{provinceCode}/barangays/

GET /cities-municipalities/
GET /cities-municipalities/{cityMunicipalityCode}/
GET /cities-municipalities/{cityMunicipalityCode}/barangays/

GET /barangays/
```

`/barangays/` accepts optional filters:

```text
GET /barangays/?regionCode=01
GET /barangays/?provinceCode=0128
GET /barangays/?cityMunicipalityCode=012801
```

## Autocomplete Route

```text
GET /address/autocomplete/?query=adams
```

Optional filters:

```text
GET /address/autocomplete/?query=pob&regionCode=01
GET /address/autocomplete/?query=pob&provinceCode=0128
GET /address/autocomplete/?query=pob&cityMunicipalityCode=012801
GET /address/autocomplete/?query=pob&limit=10
```

Example response:

```json
{
  "addresses": [
    {
      "label": "Adams (Pob.), ADAMS, ILOCOS NORTE, REGION I (ILOCOS REGION)",
      "barangay": {
        "code": "012801001",
        "name": "Adams (Pob.)"
      },
      "cityMunicipality": {
        "code": "012801",
        "name": "ADAMS"
      },
      "province": {
        "code": "0128",
        "name": "ILOCOS NORTE"
      },
      "region": {
        "code": "01",
        "name": "REGION I (ILOCOS REGION)"
      }
    }
  ]
}
```

## Notes

- The current seed data does not include a classification column that distinguishes city, municipality, district, or sub-municipality records.
- `cities`, `municipalities`, and `cities-municipalities` currently read from `city_municipalities`.
- `districts` and `sub-municipalities` return empty arrays until seed data for those levels is added.
- Run the reference seed with:

```bash
npm run db:seed:reference:local
```
