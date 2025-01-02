import { AccessToken } from "./mod.ts";
import { assertEquals } from "jsr:@std/assert";

Deno.test("access token is valid", () => {
  const accessToken = new AccessToken("token", 3600);
  assertEquals(accessToken.isValid(), true);
});

Deno.test("access token is invalid", () => {
  const accessToken = new AccessToken("token", 0);
  assertEquals(accessToken.isValid(), false);
});

Deno.test("access token is set", () => {
  const accessToken = new AccessToken("token", 3600);
  assertEquals(accessToken.token, "token");
});
