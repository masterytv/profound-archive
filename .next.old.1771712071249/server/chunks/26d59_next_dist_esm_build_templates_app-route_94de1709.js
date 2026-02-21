module.exports=[93626,e=>{"use strict";var t=e.i(95107),n=e.i(63165),r=e.i(20687),s=e.i(26476),o=e.i(48012),i=e.i(18710),a=e.i(42674),l=e.i(92779),d=e.i(62363),u=e.i(61102),c=e.i(20685),p=e.i(30936),h=e.i(61706),g=e.i(20796),_=e.i(76101),m=e.i(93695);e.i(79471);var v=e.i(16109),f=e.i(55571),y=e.i(33146);e.i(80641);var w=e.i(79253);let b=`You are an expert NDE researcher analyzing a video transcript to extract the
CHRONOLOGICAL SEQUENCE of phenomenological elements from a near-death or
out-of-body experience.

CONTEXT: This is a punctuated transcript from a YouTube video. The experiencer
may describe events non-linearly (common in spoken accounts). Reconstruct the
chronological order of the EXPERIENCE ITSELF, not the order it was told.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.

ELEMENT TAXONOMY (25 elements across 6 phases):

PHASE 1 — Initial Transition (first element should be from here):
- observing_body: Seeing own physical body/scene from external viewpoint
- void_darkness: Entering complete darkness, void, nothingness
- tunnel: Entering or traveling through a tunnel
- bright_light: Immediately encountering brilliant light

PHASE 2 — Emotional/Sensory States (can occur anytime):
- peace_calm: Overwhelming peace, tranquility, absence of pain
- joy_bliss: Intense positive emotions, ecstasy
- love_unconditional: Feeling completely loved, accepted
- fear_distress: Fear, terror, distress
- enhanced_senses: Vivid colors, clarity, 360-degree vision
- celestial_music: Otherworldly music, harmonies, voices
- time_distortion: Time stops or becomes meaningless

PHASE 3 — Encounters:
- deceased_relatives: Meeting specific dead family/friends
- beings_entities: Meeting beings, angels, guides (not recognized as deceased)
- being_of_light: Meeting THE being of light — powerful, loving presence
- religious_figure: Meeting Jesus, God, Buddha, or named religious figure
- unknown_presence: Sensing a presence without seeing it clearly

PHASE 4 — Realm/Environment:
- otherworldly_realm: Another dimension, heaven-like place
- hellish_realm: Frightening, dark, hellish environment
- cities_structures: Buildings, cities of light, crystalline structures
- nature_landscapes: Gardens, fields, mountains, meadows, water

PHASE 5 — Transformative Experiences:
- life_review: Reviewing life events, experiencing others' perspectives
- knowledge_download: Receiving universal knowledge, understanding everything
- cosmic_unity: Feeling one with everything, interconnected
- telepathy: Communicating without words, thought transfer
- future_visions: Seeing future events, prophecies

PHASE 6 — Return (last element should be from here):
- border_boundary: Reaching a barrier, fence, river they cannot cross
- choice_to_return: Given explicit choice, chose to return
- forced_return: Sent back ("It's not your time")
- sudden_return: Instantly back in body
- return_unclear: Narrative ends without describing return

EXTRACTION RULES:
1. First element SHOULD be from Phase 1 (Initial Transition)
2. Last element SHOULD be from Phase 6 (Return)
3. Extract in CHRONOLOGICAL order of the experience, not the telling
4. Include emotional states (Phase 2) only when distinct moments, not background feelings
5. Rate CONFIDENCE (0.0-1.0) based on how clearly described
6. If two things happened SIMULTANEOUSLY, use same order number
7. Minimum 3 elements, maximum 12 elements
8. Excerpts should be short (under 30 words), from the experiencer only

OUTPUT FORMAT (valid JSON only):
{
  "valid": true,
  "nde_type": "positive" | "distressing" | "mixed" | "neutral",
  "sequence": [
    {"order": 1, "element": "element_name", "excerpt": "short quote", "confidence": 0.95}
  ],
  "notes": null
}

If INVALID (too vague, not an NDE/OBE, no clear sequence):
{
  "valid": false,
  "reason": "why extraction failed",
  "nde_type": "neutral",
  "sequence": [],
  "notes": null
}`,E={darkness:"void_darkness",dark:"void_darkness",void:"void_darkness",light:"bright_light",the_light:"bright_light",oobe:"observing_body",out_of_body:"observing_body",obe:"observing_body",peace:"peace_calm",calm:"peace_calm",joy:"joy_bliss",bliss:"joy_bliss",love:"love_unconditional",fear:"fear_distress",distress:"fear_distress",music:"celestial_music",sounds:"celestial_music",relatives:"deceased_relatives",family:"deceased_relatives",beings:"beings_entities",entities:"beings_entities",angels:"beings_entities",god:"religious_figure",jesus:"religious_figure",realm:"otherworldly_realm",heaven:"otherworldly_realm",hell:"hellish_realm",garden:"nature_landscapes",meadow:"nature_landscapes",city:"cities_structures",buildings:"cities_structures",review:"life_review",knowledge:"knowledge_download",unity:"cosmic_unity",oneness:"cosmic_unity",boundary:"border_boundary",border:"border_boundary",choice:"choice_to_return",forced:"forced_return",sent_back:"forced_return"},R=new Set(["observing_body","void_darkness","tunnel","bright_light","peace_calm","joy_bliss","love_unconditional","fear_distress","enhanced_senses","celestial_music","time_distortion","deceased_relatives","beings_entities","being_of_light","religious_figure","unknown_presence","otherworldly_realm","hellish_realm","cities_structures","nature_landscapes","life_review","knowledge_download","cosmic_unity","telepathy","future_visions","border_boundary","choice_to_return","forced_return","sudden_return","return_unclear"]);async function I(e){if(!e)return null;let t=e.slice(0,5e4);try{let e=(()=>{let e=process.env.OPENAI_API_KEY;if(!e)throw Error("Missing OPENAI_API_KEY environment variable");return new w.default({apiKey:e})})(),n=(await e.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:b},{role:"user",content:`Extract the journey flow from this NDE video transcript:

${t}`}],response_format:{type:"json_object"},temperature:.2})).choices[0].message.content;if(!n)return null;let r=JSON.parse(n);return r.sequence&&r.sequence.length>0&&(r.sequence=r.sequence.map(e=>{let t;return{...e,element:(t=e.element.toLowerCase().trim(),R.has(t)?t:E[t]?E[t]:t)}})),r}catch(e){return console.error("Error in analyzeJourneyFlow:",e),null}}let x=process.env.SUPABASE_SERVICE_KEY,N=(0,y.createClient)("https://vnycavclrndjwmpaugju.supabase.co",x);async function C(e){try{let{searchParams:t}=new URL(e.url),n=t.get("videoId"),r="true"===t.get("verify"),s=t.get("limit"),o=s?parseInt(s):n?1:3,i=e.headers.get("authorization"),a=process.env.CRON_SECRET;if(!process.env.IS_DEBUG_MODE){if(!a)return console.error("CRON_SECRET is not set on the server!"),f.NextResponse.json({error:"Unauthorized: Server configuration error (Secret missing)"},{status:500});if(i!==`Bearer ${a}`)return console.warn("Auth token mismatch."),f.NextResponse.json({error:"Unauthorized: Token mismatch"},{status:401})}if(console.log(`Starting Journey Flow Analysis Batch... (Limit: ${o}, Target: ${n||"None"})`),r&&n){let{data:e,error:t}=await N.from("nde_analysis").select("video_id, journey_valid, journey_nde_type, journey_sequence, journey_notes").eq("video_id",n).single();if(t)return f.NextResponse.json({error:t.message},{status:500});return f.NextResponse.json({message:"Verification Fetch",analysis:e})}let l=[];if(n){let{data:e,error:t}=await N.from("nde_vids").select("videoId, title, subtitles_punctuated").eq("videoId",n).single();if(t||!e)return f.NextResponse.json({error:t?.message||"Video not found"},{status:404});if(!e.subtitles_punctuated)return f.NextResponse.json({error:"Video has no transcript"},{status:400});l=[e]}else{let{data:e,error:t}=await N.rpc("get_unanalyzed_journey_flow_videos",{batch_limit:o});if(t)return f.NextResponse.json({error:t.message},{status:500});l=e||[]}if(0===l.length)return f.NextResponse.json({message:"Batch complete. No new videos to process.",processedCount:0,results:[]});console.log(`Processing ${l.length} videos in parallel...`);let d=l.map(async e=>{try{let t,n,r,s,o;console.log(`Analyzing journey flow: ${e.title} (${e.videoId})...`);let i=await I(e.subtitles_punctuated);i?(t=i.valid,n=i.nde_type,r=i.sequence,s=i.notes||i.reason||null):(console.warn(`Analysis returned null for ${e.videoId} — saving sentinel.`),t=!1,n="analysis_failed",r=[],s="AI analysis returned null");let{data:a}=await N.from("nde_analysis").select("video_id").eq("video_id",e.videoId).single(),l={journey_valid:t,journey_nde_type:n,journey_sequence:r,journey_notes:s};if((o=a?await N.from("nde_analysis").update(l).eq("video_id",e.videoId):await N.from("nde_analysis").insert({video_id:e.videoId,...l})).error)return console.error(`Error saving ${e.videoId}:`,o.error),{videoId:e.videoId,status:"error",error:o.error.message};if("analysis_failed"===n)return console.log(`Marked ${e.videoId} as failed_analysis (sentinel saved).`),{videoId:e.videoId,status:"failed_analysis"};{let t=r?.length||0;return console.log(`Saved journey flow for ${e.videoId}: ${n} (${t} elements)`),{videoId:e.videoId,status:"success",journeyNdeType:n,elementCount:t}}}catch(t){return console.error(`Exception analyzing ${e.videoId}:`,t),{videoId:e.videoId,status:"error",error:t.message}}}),u=await Promise.all(d),c=u.filter(e=>"success"===e.status).length,p=u.filter(e=>"failed_analysis"===e.status).length;return f.NextResponse.json({message:`Batch complete. Processed ${c} videos (${p} failed).`,processedCount:c,attemptedCount:u.length,failedCount:p,results:u})}catch(e){return f.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>C,"dynamic",0,"force-dynamic","maxDuration",0,300],73551);var A=e.i(73551);let S=new t.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/run-journey-flow-batch/route",pathname:"/api/run-journey-flow-batch",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/api/run-journey-flow-batch/route.ts",nextConfigOutput:"",userland:A}),{workAsyncStorage:O,workUnitAsyncStorage:T,serverHooks:j}=S;function P(){return(0,r.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:T})}async function k(e,t,r){S.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let f="/api/run-journey-flow-batch/route";f=f.replace(/\/index$/,"")||"/";let y=await S.prepare(e,t,{srcPage:f,multiZoneDraftMode:!1});if(!y)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:w,params:b,nextConfig:E,parsedUrl:R,isDraftMode:I,prerenderManifest:x,routerServerContext:N,isOnDemandRevalidate:C,revalidateOnlyGenerated:A,resolvedPathname:O,clientReferenceManifest:T,serverActionsManifest:j}=y,P=(0,a.normalizeAppPath)(f),k=!!(x.dynamicRoutes[P]||x.routes[O]),q=async()=>((null==N?void 0:N.render404)?await N.render404(e,t,R,!1):t.end("This page could not be found"),null);if(k&&!I){let e=!!x.routes[O],t=x.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(E.experimental.adapterPath)return await q();throw new m.NoFallbackError}}let U=null;!k||S.isDev||I||(U="/index"===(U=O)?"/":U);let H=!0===S.isDev||!k,$=k&&!H;j&&T&&(0,i.setManifestsSingleton)({page:f,clientReferenceManifest:T,serverActionsManifest:j});let D=e.method||"GET",M=(0,o.getTracer)(),L=M.getActiveScopeSpan(),F={params:b,prerenderManifest:x,renderOpts:{experimental:{authInterrupts:!!E.experimental.authInterrupts},cacheComponents:!!E.cacheComponents,supportsDynamicResponse:H,incrementalCache:(0,s.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:E.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,n,r,s)=>S.onRequestError(e,t,r,s,N)},sharedContext:{buildId:w}},B=new l.NodeNextRequest(e),K=new l.NodeNextResponse(t),z=d.NextRequestAdapter.fromNodeNextRequest(B,(0,d.signalFromNodeResponse)(t));try{let i=async e=>S.handle(z,F).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let n=M.getRootSpanAttributes();if(!n)return;if(n.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${n.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=n.get("next.route");if(r){let t=`${D} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${D} ${f}`)}),a=!!(0,s.getRequestMeta)(e,"minimalMode"),l=async s=>{var o,l;let d=async({previousCacheEntry:n})=>{try{if(!a&&C&&A&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await i(s);e.fetchMetrics=F.renderOpts.fetchMetrics;let l=F.renderOpts.pendingWaitUntil;l&&r.waitUntil&&(r.waitUntil(l),l=void 0);let d=F.renderOpts.collectedTags;if(!k)return await (0,p.sendResponse)(B,K,o,F.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(o.headers);d&&(t[_.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let n=void 0!==F.renderOpts.collectedRevalidate&&!(F.renderOpts.collectedRevalidate>=_.INFINITE_CACHE)&&F.renderOpts.collectedRevalidate,r=void 0===F.renderOpts.collectedExpire||F.renderOpts.collectedExpire>=_.INFINITE_CACHE?void 0:F.renderOpts.collectedExpire;return{value:{kind:v.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:n,expire:r}}}}catch(t){throw(null==n?void 0:n.isStale)&&await S.onRequestError(e,t,{routerKind:"App Router",routePath:f,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:C})},!1,N),t}},u=await S.handleResponse({req:e,nextConfig:E,cacheKey:U,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:x,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:A,responseGenerator:d,waitUntil:r.waitUntil,isMinimalMode:a});if(!k)return null;if((null==u||null==(o=u.value)?void 0:o.kind)!==v.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(l=u.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});a||t.setHeader("x-nextjs-cache",C?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),I&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,h.fromNodeOutgoingHttpHeaders)(u.value.headers);return a&&k||m.delete(_.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,g.getCacheControlHeader)(u.cacheControl)),await (0,p.sendResponse)(B,K,new Response(u.value.body,{headers:m,status:u.value.status||200})),null};L?await l(L):await M.withPropagatedContext(e.headers,()=>M.trace(u.BaseServerSpan.handleRequest,{spanName:`${D} ${f}`,kind:o.SpanKind.SERVER,attributes:{"http.method":D,"http.target":e.url}},l))}catch(t){if(t instanceof m.NoFallbackError||await S.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:C})},!1,N),k)throw t;return await (0,p.sendResponse)(B,K,new Response(null,{status:500})),null}}e.s(["handler",()=>k,"patchFetch",()=>P,"routeModule",()=>S,"serverHooks",()=>j,"workAsyncStorage",()=>O,"workUnitAsyncStorage",()=>T],93626)}];

//# sourceMappingURL=26d59_next_dist_esm_build_templates_app-route_94de1709.js.map