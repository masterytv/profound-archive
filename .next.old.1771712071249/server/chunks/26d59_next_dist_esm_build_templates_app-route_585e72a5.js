module.exports=[66263,e=>{"use strict";var t=e.i(95107),n=e.i(63165),r=e.i(20687),o=e.i(26476),i=e.i(48012),a=e.i(18710),s=e.i(42674),l=e.i(92779),d=e.i(62363),c=e.i(61102),u=e.i(20685),p=e.i(30936),f=e.i(61706),m=e.i(20796),h=e.i(76101),g=e.i(93695);e.i(79471);var v=e.i(16109),_=e.i(55571),y=e.i(33146);e.i(80641);var w=e.i(79253);let R=`You are an expert analyst of near-death experiences (NDEs) and out-of-body experiences (OBEs), specializing in video transcript analysis.

CONTEXT: This is a punctuated transcript from a YouTube video where someone describes their experience. The speech may be conversational, non-linear, or include interviewer questions. Focus ONLY on the experiencer's first-person account. Ignore filler words, interviewer commentary, and tangential discussions.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.

OUTPUT SCHEMA:
{
  "experience_type": "nde" | "obe" | "sde" | "adc" | "ste" | "dream" | "meditation" | "other",
  "type_confidence": 0-100,
  "summary": "2-3 sentence summary of the experience itself",
  "elements": [
    {"name": "out_of_body", "present": true/false, "confidence": 0-100, "quote": "supporting quote from transcript or empty string"},
    {"name": "tunnel", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "bright_light", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "deceased_relatives", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "life_review", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "being_of_light", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "border_boundary", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "feelings_of_peace", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "cosmic_unity", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "time_distortion", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "enhanced_senses", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "telepathy", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "otherworldly_realm", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "knowledge_download", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "choice_to_return", "present": true/false, "confidence": 0-100, "quote": ""}
  ],
  "trigger": {
    "category": "medical_crisis" | "accident" | "surgery" | "illness" | "cardiac_arrest" | "near_drowning" | "childbirth" | "combat" | "suicide_attempt" | "overdose" | "allergic_reaction" | "spontaneous" | "other" | "unknown",
    "description": "brief description of what caused the experience"
  },
  "overall_tone": "very_positive" | "positive" | "neutral" | "negative" | "very_negative" | "mixed",
  "intensity_rating": 1-10,
  "content_safety": {
    "overall_safe": true/false,
    "flags": {
      "suicide_related": true/false,
      "self_harm": true/false,
      "distressing_content": true/false,
      "medical_graphic": true/false,
      "child_death": true/false
    },
    "warning_level": "none" | "mild" | "moderate" | "severe"
  }
}

Experience type definitions:
- nde: Near-death experience (clinical death, life-threatening crisis)
- obe: Out-of-body experience (no life-threatening situation)
- sde: Shared death experience (witnessed another's death, shared their transition)
- adc: After-death communication (contact from deceased person, not during crisis)
- ste: Spiritually transformative experience (mystical, no death proximity)
- dream: Dream or lucid dream
- meditation: During meditation practice
- other: Does not fit above categories

Element definitions:
- out_of_body: Perceived from outside the physical body
- tunnel: Entered or traveled through a tunnel
- bright_light: Encountered brilliant or supernatural light
- deceased_relatives: Met dead family members or friends
- life_review: Reviewed life events, saw life flash
- being_of_light: Encountered a distinct, powerful light being
- border_boundary: Reached a barrier or point of no return
- feelings_of_peace: Overwhelming peace, absence of pain
- cosmic_unity: Felt one with everything
- time_distortion: Time stopped, sped up, or became meaningless
- enhanced_senses: Heightened perception, vivid colors, clarity
- telepathy: Communication without words
- otherworldly_realm: Being in another dimension or realm
- knowledge_download: Received universal knowledge or understanding
- choice_to_return: Given choice to stay or return

Scoring rules:
- Only mark elements as present if clearly described or strongly implied
- Confidence reflects how explicitly the element was described (100 = verbatim, 50 = implied)
- Quotes should be short (under 30 words) and from the experiencer only
- For trigger: if unknown or not mentioned, use "unknown"
- For content safety: only flag if CLEARLY present. When in doubt, do NOT flag.`;async function E(e){if(!e)return null;let t=e.slice(0,5e4);try{let e=(()=>{let e=process.env.OPENAI_API_KEY;if(!e)throw Error("Missing OPENAI_API_KEY environment variable");return new w.default({apiKey:e})})(),n=(await e.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:R},{role:"user",content:`Analyze this NDE video transcript:

${t}`}],response_format:{type:"json_object"},temperature:.2})).choices[0].message.content;if(!n)return null;return JSON.parse(n)}catch(e){return console.error("Error in analyzeCoreElements:",e),null}}let b=process.env.SUPABASE_SERVICE_KEY,x=(0,y.createClient)("https://vnycavclrndjwmpaugju.supabase.co",b);async function C(e){try{let{searchParams:t}=new URL(e.url),n=t.get("videoId"),r="true"===t.get("verify"),o=t.get("limit"),i=o?parseInt(o):n?1:3,a=e.headers.get("authorization"),s=process.env.CRON_SECRET;if(!process.env.IS_DEBUG_MODE){if(!s)return console.error("CRON_SECRET is not set on the server!"),_.NextResponse.json({error:"Unauthorized: Server configuration error (Secret missing)"},{status:500});if(a!==`Bearer ${s}`)return console.warn("Auth token mismatch."),_.NextResponse.json({error:"Unauthorized: Token mismatch"},{status:401})}if(console.log(`Starting Core Elements Analysis Batch... (Limit: ${i}, Target: ${n||"None"})`),r&&n){let{data:e,error:t}=await x.from("nde_analysis").select("video_id, experience_type, experience_type_confidence, core_elements, trigger_category, overall_tone, intensity_rating, content_safety").eq("video_id",n).single();if(t)return _.NextResponse.json({error:t.message},{status:500});return _.NextResponse.json({message:"Verification Fetch",analysis:e})}let l=[];if(n){let{data:e,error:t}=await x.from("nde_vids").select("videoId, title, subtitles_punctuated").eq("videoId",n).single();if(t||!e)return _.NextResponse.json({error:t?.message||"Video not found"},{status:404});if(!e.subtitles_punctuated)return _.NextResponse.json({error:"Video has no transcript"},{status:400});l=[e]}else{let{data:e,error:t}=await x.rpc("get_unanalyzed_core_elements_videos",{batch_limit:i});if(t)return _.NextResponse.json({error:t.message},{status:500});l=e||[]}if(0===l.length)return _.NextResponse.json({message:"Batch complete. No new videos to process.",processedCount:0,results:[]});console.log(`Processing ${l.length} videos in parallel...`);let d=l.map(async e=>{try{let t,n,r,o,i,a,s,l,d;console.log(`Analyzing core elements: ${e.title} (${e.videoId})...`);let c=await E(e.subtitles_punctuated);c?(t=c.experience_type,n=c.type_confidence,r=c.elements,o=c.trigger.category,i=c.trigger.description,a=c.overall_tone,s=c.intensity_rating,l=c.content_safety):(console.warn(`Analysis returned null for ${e.videoId} — saving sentinel.`),t="analysis_failed",n=0,r={error:"AI analysis returned null",timestamp:new Date().toISOString()},o="unknown",i="",a="neutral",s=-1,l={});let{data:u}=await x.from("nde_analysis").select("video_id").eq("video_id",e.videoId).single(),p={experience_type:t,experience_type_confidence:n,core_elements:r,trigger_category:o,trigger_description:i,overall_tone:a,intensity_rating:s,content_safety:l};if((d=u?await x.from("nde_analysis").update(p).eq("video_id",e.videoId):await x.from("nde_analysis").insert({video_id:e.videoId,...p})).error)return console.error(`Error saving ${e.videoId}:`,d.error),{videoId:e.videoId,status:"error",error:d.error.message};if("analysis_failed"===t)return console.log(`Marked ${e.videoId} as failed_analysis (sentinel saved).`),{videoId:e.videoId,status:"failed_analysis"};return console.log(`Saved core elements for ${e.videoId}: ${t} (${n}%)`),{videoId:e.videoId,status:"success",experienceType:t}}catch(t){return console.error(`Exception analyzing ${e.videoId}:`,t),{videoId:e.videoId,status:"error",error:t.message}}}),c=await Promise.all(d),u=c.filter(e=>"success"===e.status).length,p=c.filter(e=>"failed_analysis"===e.status).length;return _.NextResponse.json({message:`Batch complete. Processed ${u} videos (${p} failed).`,processedCount:u,attemptedCount:c.length,failedCount:p,results:c})}catch(e){return _.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>C,"dynamic",0,"force-dynamic","maxDuration",0,300],56548);var N=e.i(56548);let I=new t.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/run-core-elements-batch/route",pathname:"/api/run-core-elements-batch",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/Documents/Antigravity/ProjectProfound/profound-archive/src/app/api/run-core-elements-batch/route.ts",nextConfigOutput:"",userland:N}),{workAsyncStorage:A,workUnitAsyncStorage:O,serverHooks:T}=I;function S(){return(0,r.patchFetch)({workAsyncStorage:A,workUnitAsyncStorage:O})}async function q(e,t,r){I.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let _="/api/run-core-elements-batch/route";_=_.replace(/\/index$/,"")||"/";let y=await I.prepare(e,t,{srcPage:_,multiZoneDraftMode:!1});if(!y)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:w,params:R,nextConfig:E,parsedUrl:b,isDraftMode:x,prerenderManifest:C,routerServerContext:N,isOnDemandRevalidate:A,revalidateOnlyGenerated:O,resolvedPathname:T,clientReferenceManifest:S,serverActionsManifest:q}=y,P=(0,s.normalizeAppPath)(_),k=!!(C.dynamicRoutes[P]||C.routes[T]),$=async()=>((null==N?void 0:N.render404)?await N.render404(e,t,b,!1):t.end("This page could not be found"),null);if(k&&!x){let e=!!C.routes[T],t=C.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(E.experimental.adapterPath)return await $();throw new g.NoFallbackError}}let D=null;!k||I.isDev||x||(D="/index"===(D=T)?"/":D);let U=!0===I.isDev||!k,j=k&&!U;q&&S&&(0,a.setManifestsSingleton)({page:_,clientReferenceManifest:S,serverActionsManifest:q});let H=e.method||"GET",M=(0,i.getTracer)(),B=M.getActiveScopeSpan(),F={params:R,prerenderManifest:C,renderOpts:{experimental:{authInterrupts:!!E.experimental.authInterrupts},cacheComponents:!!E.cacheComponents,supportsDynamicResponse:U,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:E.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,n,r,o)=>I.onRequestError(e,t,r,o,N)},sharedContext:{buildId:w}},L=new l.NodeNextRequest(e),K=new l.NodeNextResponse(t),z=d.NextRequestAdapter.fromNodeNextRequest(L,(0,d.signalFromNodeResponse)(t));try{let a=async e=>I.handle(z,F).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let n=M.getRootSpanAttributes();if(!n)return;if(n.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${n.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=n.get("next.route");if(r){let t=`${H} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${_}`)}),s=!!(0,o.getRequestMeta)(e,"minimalMode"),l=async o=>{var i,l;let d=async({previousCacheEntry:n})=>{try{if(!s&&A&&O&&!n)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await a(o);e.fetchMetrics=F.renderOpts.fetchMetrics;let l=F.renderOpts.pendingWaitUntil;l&&r.waitUntil&&(r.waitUntil(l),l=void 0);let d=F.renderOpts.collectedTags;if(!k)return await (0,p.sendResponse)(L,K,i,F.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,f.toNodeOutgoingHttpHeaders)(i.headers);d&&(t[h.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let n=void 0!==F.renderOpts.collectedRevalidate&&!(F.renderOpts.collectedRevalidate>=h.INFINITE_CACHE)&&F.renderOpts.collectedRevalidate,r=void 0===F.renderOpts.collectedExpire||F.renderOpts.collectedExpire>=h.INFINITE_CACHE?void 0:F.renderOpts.collectedExpire;return{value:{kind:v.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:n,expire:r}}}}catch(t){throw(null==n?void 0:n.isStale)&&await I.onRequestError(e,t,{routerKind:"App Router",routePath:_,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:A})},!1,N),t}},c=await I.handleResponse({req:e,nextConfig:E,cacheKey:D,routeKind:n.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:C,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:O,responseGenerator:d,waitUntil:r.waitUntil,isMinimalMode:s});if(!k)return null;if((null==c||null==(i=c.value)?void 0:i.kind)!==v.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(l=c.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});s||t.setHeader("x-nextjs-cache",A?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),x&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let g=(0,f.fromNodeOutgoingHttpHeaders)(c.value.headers);return s&&k||g.delete(h.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||g.get("Cache-Control")||g.set("Cache-Control",(0,m.getCacheControlHeader)(c.cacheControl)),await (0,p.sendResponse)(L,K,new Response(c.value.body,{headers:g,status:c.value.status||200})),null};B?await l(B):await M.withPropagatedContext(e.headers,()=>M.trace(c.BaseServerSpan.handleRequest,{spanName:`${H} ${_}`,kind:i.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},l))}catch(t){if(t instanceof g.NoFallbackError||await I.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:A})},!1,N),k)throw t;return await (0,p.sendResponse)(L,K,new Response(null,{status:500})),null}}e.s(["handler",()=>q,"patchFetch",()=>S,"routeModule",()=>I,"serverHooks",()=>T,"workAsyncStorage",()=>A,"workUnitAsyncStorage",()=>O],66263)}];

//# sourceMappingURL=26d59_next_dist_esm_build_templates_app-route_585e72a5.js.map