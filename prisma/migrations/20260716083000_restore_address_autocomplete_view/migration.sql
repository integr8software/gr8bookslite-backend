CREATE OR REPLACE VIEW "address_autocomplete_view" AS
SELECT
    b."barangay_code",
    b."name" AS "barangay_name",
    cm."city_municipality_code",
    cm."name" AS "city_municipality_name",
    p."province_code",
    p."name" AS "province_name",
    r."region_code",
    r."name" AS "region_name",
    CONCAT_WS(', ', b."name", cm."name", p."name", r."name") AS "label",
    LOWER(
        CONCAT_WS(
            ' ',
            b."barangay_code",
            b."name",
            cm."city_municipality_code",
            cm."name",
            p."province_code",
            p."name",
            r."region_code",
            r."name",
            CONCAT_WS(', ', b."name", cm."name", p."name", r."name")
        )
    ) AS "search_text"
FROM "barangays" b
JOIN "city_municipalities" cm
    ON cm."city_municipality_code" = b."city_municipality_code"
JOIN "provinces" p
    ON p."province_code" = b."province_code"
JOIN "regions" r
    ON r."region_code" = b."region_code";
