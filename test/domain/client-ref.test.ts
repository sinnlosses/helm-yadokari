import { describe, expect, it } from "vitest"

import { formatClientRef, parseClientRef } from "../../src/domain/client-ref.js"
import { toClientId, toTenantId } from "../../src/types/types.js"

describe("formatClientRef", () => {
  it("tenantIdとclientIdを区切り文字でつないだ文字列を返す", () => {
    expect(formatClientRef(toTenantId("tenantId1"), toClientId("clientId1"))).toBe(
      "tenantId1/clientId1",
    )
  })
})

describe("parseClientRef", () => {
  it("組を表す文字列をtenantIdとclientIdに分解する", () => {
    expect(parseClientRef("tenantId1/clientId1")).toEqual({
      tenantId: "tenantId1",
      clientId: "clientId1",
    })
  })

  it("formatClientRefが返した文字列を元の組に戻せる", () => {
    const client = { tenantId: toTenantId("tenantId1"), clientId: toClientId("clientId1") }
    expect(parseClientRef(formatClientRef(client.tenantId, client.clientId))).toEqual(client)
  })

  it("区切り文字がないとき undefined を返す", () => {
    expect(parseClientRef("tenantId1")).toBeUndefined()
  })

  it("区切り文字が2つ以上あるとき undefined を返す", () => {
    expect(parseClientRef("tenantId1/clientId1/extra")).toBeUndefined()
  })

  it("tenantIdが空のとき undefined を返す", () => {
    expect(parseClientRef("/clientId1")).toBeUndefined()
  })

  it("clientIdが空のとき undefined を返す", () => {
    expect(parseClientRef("tenantId1/")).toBeUndefined()
  })
})
