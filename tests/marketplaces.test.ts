import { test } from "node:test";
import assert from "node:assert/strict";
import { contentSchema } from "../server/validation.js";

test("external marketplace links accept matching HTTPS stores and reject misleading destinations", () => {
 const amazon=contentSchema.shape.marketplaceAmazonUrl,flipkart=contentSchema.shape.marketplaceFlipkartUrl;
 for(const url of ["", "https://www.amazon.in/stores/example", "https://amazon.com/shop/example"])assert.equal(amazon.safeParse(url).success,true);
 assert.equal(flipkart.safeParse("https://www.flipkart.com/seller/example").success,true);
 for(const url of ["javascript:alert(1)","http://amazon.in/store","https://amazon.in.evil.test/store","https://evil.test/amazon.in","https://user:secret@amazon.in/store","https://flipkart.com/store"])assert.equal(amazon.safeParse(url).success,false);
 assert.equal(flipkart.safeParse("https://amazon.in/store").success,false);
});
