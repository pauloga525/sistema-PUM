// Archivo de arranque para cPanel → Application Manager (Phusion Passenger).
// El workflow de despliegue lo copia como app.js junto al server.js que
// genera `next build` con output "standalone".
//
// Passenger intercepta el listen() del servidor, así que el puerto no importa;
// se fija HOSTNAME porque en Linux puede venir con el nombre de la máquina.
process.env.NODE_ENV = "production";
process.env.HOSTNAME = "127.0.0.1";

// CommonJS a propósito: Passenger carga el archivo con require().
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./server.js");
