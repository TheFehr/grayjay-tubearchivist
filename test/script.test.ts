//#region imports
import { describe, test, before } from "node:test"
import assert from "node:assert"
import { readFileSync } from "node:fs"
import { join } from "node:path"
// initializes global state (source, http, bridge, etc.)
import "@kaidelorenzo/grayjay-polyfill"
// fills in content/value classes the polyfill above doesn't implement
import "./grayjay-shims.ts"

// Import your script from the build output
import "../dist/script.js"
//#endregion

const config = JSON.parse(readFileSync(join(process.cwd(), "dist/config.json"), "utf8"))
const baseUrlSetting = config.settings?.find((s: any) => s.variable === "baseUrl")
// baseUrl's value is a numeric index into options (see constants.ts getBaseUrl) — resolve it
const resolvedBaseUrl = baseUrlSetting?.options?.[parseInt(baseUrlSetting?.default ?? "0", 10)]
const isLiveConfig = !!resolvedBaseUrl && !resolvedBaseUrl.includes("example.com")

/** Redacts any header commonly used to carry credentials before logging test output */
function redacted(obj: unknown): string {
    return JSON.stringify(obj, (key, value) => {
        if (typeof key === "string" && /^authorization$/i.test(key)) return "***REDACTED***"
        return value
    }, 2)
}

describe("TubeArchivist Plugin Tests", { skip: false }, () => {
    before(() => {
        if (source.enable) {
            source.enable(config, {})
        }
    })

    test("source should be initialized", { skip: false }, () => {
        assert.ok(source, "source object should exist")
        assert.ok(source.enable, "source.enable should exist")
        assert.ok(source.getHome, "source.getHome should exist")
        assert.ok(typeof source.getUserSubscriptions === "function", "source.getUserSubscriptions should exist")
    })

    test("getHome should return video results", { skip: !isLiveConfig }, () => {
        const result = source.getHome() as VideoPager
        assert.ok(result, "getHome should return a result")
        assert.ok(Array.isArray(result.results), "results should be an array")
        console.log(`getHome returned ${result.results.length} videos, hasMore=${result.hasMore}`)
        if (result.results.length) {
            console.log("first video:", redacted(result.results[0]))
        }
    })

    test("search should return video results for a real query", { skip: !isLiveConfig }, () => {
        const results = source.search!("hog", "VIDEO", "", new Map()) as VideoPager
        assert.ok(results, "search should return results")
        console.log(`search("hog") returned ${results.results.length} videos`)
    })

    test("searchChannels should return channel results for a real query", { skip: !isLiveConfig }, () => {
        const results = source.searchChannels!("hog") as ChannelPager
        assert.ok(results, "searchChannels should return results")
        console.log(`searchChannels("hog") returned ${results.results.length} channels`)
        if (results.results.length) {
            console.log("first channel:", redacted(results.results[0]))
        }
    })

    test("getContentDetails should return details for the first home video", { skip: !isLiveConfig }, () => {
        const home = source.getHome() as VideoPager
        assert.ok(home.results.length > 0, "expected at least one home video to fetch details for")

        const url = (home.results[0] as any).url
        assert.ok(source.isContentDetailsUrl!(url), "isContentDetailsUrl should recognize the video url")

        const details = source.getContentDetails!(url) as PlatformVideoDetails
        assert.ok(details, "getContentDetails should return a result")
        console.log("video details:", redacted(details))
    })

    test("getPlaybackTracker should report progress to TubeArchivist", { skip: !isLiveConfig }, () => {
        const home = source.getHome() as VideoPager
        assert.ok(home.results.length > 0, "expected at least one home video")

        const url = (home.results[0] as any).url
        const details = source.getContentDetails!(url) as any
        assert.ok(typeof details.getPlaybackTracker === "function", "getPlaybackTracker should be a function on video details")

        const tracker = details.getPlaybackTracker()
        assert.ok(tracker, "getPlaybackTracker() should return a tracker")
        assert.ok(typeof tracker.nextRequest === "number", "tracker should expose a numeric nextRequest")
        assert.ok(typeof tracker.onProgress === "function", "tracker should expose onProgress")

        tracker.onInit(3)
        tracker.onProgress(7, true)
        tracker.onConcluded()

        console.log(`playback tracker: nextRequest=${tracker.nextRequest}ms, reported position 3s then 7s for ${(home.results[0] as any).name}`)
    })

    test("getUserSubscriptions should return resolvable channel URLs", { skip: !isLiveConfig }, () => {
        const urls = source.getUserSubscriptions!()
        assert.ok(Array.isArray(urls), "getUserSubscriptions should return an array")
        // GrayJay hard-casts every element to a JS string (JSClient.kt) — anything
        // else crashes on the device, so this is the single most important assertion.
        for (const url of urls) {
            assert.strictEqual(typeof url, "string", `every subscription entry must be a string, got ${typeof url}`)
        }
        console.log(`getUserSubscriptions returned ${urls.length} subscribed channel(s)`)

        const sample = urls.slice(0, 5)
        for (const url of sample) {
            assert.ok(source.isChannelUrl!(url), `isChannelUrl should recognize returned url: ${url}`)
            const channel = source.getChannel!(url) as PlatformChannel
            assert.ok(channel, `getChannel should resolve returned url: ${url}`)
        }
        if (sample.length) {
            console.log(`verified round-trip (isChannelUrl + getChannel) for ${sample.length} sample url(s)`)
        }
    })

    test("dynamic token fetch fallback should fail gracefully without a static token or login session", { skip: !isLiveConfig }, () => {
        const configWithoutStaticToken = JSON.parse(JSON.stringify(config))
        if (configWithoutStaticToken.constants) delete configWithoutStaticToken.constants.authorization

        source.enable!(configWithoutStaticToken, {})
        try {
            // No real login session exists in this Node test environment, so
            // TubeArchivist is expected to reject the request — this only
            // verifies the fallback path fails cleanly (a thrown
            // ScriptException, not an unhandled crash/hang), not the happy
            // path, which needs a real device login session to exercise.
            assert.throws(() => source.getHome!(), undefined, "expected an auth-related error without a token, not a silent success")
        } finally {
            // restore the real config for any tests that run after this one
            source.enable!(config, {})
        }
    })
})
