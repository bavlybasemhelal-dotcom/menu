import { writeFileSync } from "node:fs";
const indexes = [];
const field = (fieldPath, order = "ASCENDING") => ({ fieldPath, order });
const add = (collectionGroup, fields) => {
  if (fields.length > 1)
    indexes.push({ collectionGroup, queryScope: "COLLECTION", fields });
};
const filters = [
  "categoryId",
  "searchTokens",
  "discountEligible",
  "availability",
];
for (const withStatus of [false, true])
  for (let mask = 0; mask < 16; mask++) {
    const fields = withStatus ? [field("status")] : [];
    filters.forEach((name, i) => {
      if (mask & (1 << i))
        fields.push(
          name === "searchTokens"
            ? { fieldPath: name, arrayConfig: "CONTAINS" }
            : field(name),
        );
    });
    add("products", [...fields, field("updatedAt", "DESCENDING")]);
  }
add("categories", [field("status"), field("order")]);
for (const base of [
  [],
  [field("status")],
  [field("status"), field("needsReview")],
])
  for (let mask = 0; mask < 4; mask++)
    add("offers", [
      ...base,
      ...(mask & 1 ? [field("type")] : []),
      ...(mask & 2 ? [field("placement")] : []),
      field("displayOrder"),
    ]);
writeFileSync(
  "firestore.indexes.json",
  JSON.stringify({ indexes, fieldOverrides: [] }, null, 2) + "\n",
);
