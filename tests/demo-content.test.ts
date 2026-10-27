import { getDemoJobs, filterDemoJobs } from "../src/demo-jobs.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { withDemoContent } from "../src/demo-site.js";
import { galleryCategories } from "../src/corporate-config.js";
import type { Site } from "../src/api.js";

test("demo content fills all public sections only for local demonstration and preserves saved records", () => {
 const site: Site = {company:"OSLC",heroTitle:"",heroDescription:"",tagline:"",about:"OSLC company",quality:"",address:"Kosad, Surat",categories:[],capabilities:[],gallery:[],demoMode:true};
 assert.equal(withDemoContent(site,false),site);
 const live={...site,demoMode:false}; assert.equal(withDemoContent(live,true),live);
 const demo=withDemoContent(site,true);
 assert.equal(demo.demoPreview,true);
 for(const key of ["history","mission","vision","quality","process","segmentMen","segmentWomen","segmentKids","leadershipMessage","hours","privacy","terms"]) assert.ok(demo[key],key);
 assert.equal(demo.leadership.length,3); assert.equal(demo.capabilities.length,6); assert.equal(demo.events.length,4);
 assert.deepEqual(demo.gallery.map(g=>g.category),[...galleryCategories]);
 assert.match(demo.email,/\.invalid$/);
 assert.equal(site.gallery.length,0);
 const saved={...site,leadership:[{id:"verified-leader"}],gallery:[{...demo.gallery[0],id:"verified-photo"}],events:[{id:"verified-event"}],capabilities:[{...demo.capabilities[0],id:"verified-process"}]};
 const result=withDemoContent(saved,true);
 for(const key of ["leadership","gallery","events","capabilities"]) assert.equal(result[key],saved[key as keyof typeof saved]);
});

test("sample jobs are clearly marked, filterable, and unpublished", () => {
 const jobs=getDemoJobs([{id:"production-id",name:"Production"}]);
 assert.equal(jobs.length,6);
 assert.ok(jobs.every(j=>j.title.includes("(Demo)") && !j.published && !j.structured_data && j.slug.startsWith("demo-")));
 assert.equal(filterDemoJobs(jobs,{search:"",department:"production-id",type:"",experience:""}).length,1);
 assert.equal(filterDemoJobs(jobs,{search:"design",department:"",type:"Internship",experience:"Entry level"}).length,1);
 assert.equal(filterDemoJobs(jobs,{search:"unmatched",department:"",type:"",experience:""}).length,0);
});
