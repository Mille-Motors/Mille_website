import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clientIp,
  clientRateLimitKey,
  clientUserAgent,
  requestId,
} from "@/server/http/client-ip";

/**
 * De dónde sale la IP que queda en la prueba de un consentimiento.
 *
 * La propiedad que estas pruebas fijan es la que da valor al dato: la IP la
 * lee el SERVIDOR de las cabeceras del proxy, y nunca de nada que pueda
 * escribir el cliente. Una IP enviada por el navegador no probaría de dónde
 * vino una autorización; probaría qué quiso escribir quien la envió.
 *
 * El orden de preferencia sale de la documentación de cabeceras de Vercel:
 * `x-vercel-forwarded-for` es la que pone la plataforma y la que un proxy
 * propio por delante no reemplaza; `x-forwarded-for` es equivalente pero sí
 * puede quedar alterada en ese caso.
 */

const request = (headers: Record<string, string>) =>
  new Request("https://millemotorculture.com/api/inquiries", {
    method: "POST",
    headers,
  });

describe("la IP del cliente", () => {
  it("prefiere la cabecera que pone la plataforma", () => {
    const ip = clientIp(
      request({
        "x-vercel-forwarded-for": "190.85.1.2",
        "x-forwarded-for": "10.0.0.1",
        "x-real-ip": "10.0.0.2",
      }),
    );
    assert.equal(ip.address, "190.85.1.2");
    assert.equal(ip.header, "x-vercel-forwarded-for");
  });

  it("cae a x-forwarded-for cuando no hay otra", () => {
    const ip = clientIp(request({ "x-forwarded-for": "190.85.1.2" }));
    assert.equal(ip.address, "190.85.1.2");
    assert.equal(ip.header, "x-forwarded-for");
  });

  it("cae a x-real-ip como último recurso", () => {
    const ip = clientIp(request({ "x-real-ip": "190.85.1.2" }));
    assert.equal(ip.address, "190.85.1.2");
    assert.equal(ip.header, "x-real-ip");
  });

  it("toma el PRIMER salto de la cadena, que es el cliente", () => {
    const ip = clientIp(
      request({ "x-forwarded-for": "190.85.1.2, 70.41.3.18, 150.172.238.178" }),
    );
    assert.equal(ip.address, "190.85.1.2");
  });

  it("ignora los espacios de la cadena", () => {
    const ip = clientIp(request({ "x-forwarded-for": "  190.85.1.2  , 10.0.0.1" }));
    assert.equal(ip.address, "190.85.1.2");
  });

  it("deja constancia de QUÉ cabecera la trajo", () => {
    // Sin esto no se puede valorar el dato después: cuánto vale una IP
    // depende de quién puso la cabecera.
    assert.equal(
      clientIp(request({ "x-real-ip": "190.85.1.2" })).header,
      "x-real-ip",
    );
  });

  it("acepta IPv6", () => {
    const ip = clientIp(
      request({ "x-forwarded-for": "2001:db8:85a3::8a2e:370:7334" }),
    );
    assert.equal(ip.address, "2001:db8:85a3::8a2e:370:7334");
  });

  it("devuelve null sin ninguna cabecera, en vez de inventar un valor", () => {
    // Es el caso de desarrollo local. Un evento sin IP sigue siendo válido
    // —la ley no exige registrar la IP—, y escribir "127.0.0.1" o
    // "desconocida" ensuciaría la evidencia con algo que parece un dato.
    const ip = clientIp(request({}));
    assert.equal(ip.address, null);
    assert.equal(ip.header, null);
  });

  it("descarta lo que no tiene forma de dirección", () => {
    for (const value of [
      "unknown",
      "",
      "localhost",
      "no-es-una-ip",
      "999.999.999.999",
      "1.2.3",
      "<script>alert(1)</script>",
      "190.85.1.2'; DROP TABLE",
    ]) {
      assert.equal(
        clientIp(request({ "x-forwarded-for": value })).address,
        null,
        `aceptó "${value}" como IP`,
      );
    }
  });

  it("rechaza un octeto fuera de rango", () => {
    assert.equal(
      clientIp(request({ "x-forwarded-for": "256.1.1.1" })).address,
      null,
    );
  });

  it("no mira ninguna cabecera que el cliente pueda inventarse", () => {
    // Una cabecera a medida no es una fuente de IP. Solo se consultan las
    // tres que pone el proxy de la plataforma.
    const ip = clientIp(
      request({
        "client-ip": "1.1.1.1",
        "true-client-ip": "2.2.2.2",
        forwarded: "for=3.3.3.3",
        "x-mille-ip": "4.4.4.4",
      }),
    );
    assert.equal(ip.address, null);
  });
});

describe("el resto de la evidencia de la petición", () => {
  it("guarda el identificador de traza de la plataforma", () => {
    assert.equal(
      requestId(request({ "x-vercel-id": "bog1::abc123" })),
      "bog1::abc123",
    );
    assert.equal(requestId(request({})), null);
  });

  it("acota el agente de usuario", () => {
    const long = "A".repeat(500);
    assert.equal(clientUserAgent(request({ "user-agent": long }))?.length, 300);
    assert.equal(clientUserAgent(request({})), null);
  });
});

describe("la clave del freno antispam", () => {
  it("es la misma IP que la evidencia, no otra resolución", () => {
    // Tener dos formas de averiguar la IP en el mismo proyecto es tener dos
    // respuestas posibles a la misma pregunta, y la de la evidencia es la que
    // tiene que ser exacta.
    const req = request({ "x-vercel-forwarded-for": "190.85.1.2" });
    assert.equal(clientRateLimitKey(req), clientIp(req).address);
  });

  it("comparte un cubo común cuando no hay IP", () => {
    // Un freno peor, pero el único posible cuando no se distingue a nadie.
    assert.equal(clientRateLimitKey(request({})), "unknown");
  });
});
