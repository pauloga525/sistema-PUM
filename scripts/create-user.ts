/**
 * Crea usuarios docentes manualmente.
 * Uso: npx dotenvx run -- npx ts-node --skip-project scripts/create-user.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

const USERS = [
  {
    "name": "Guzhñay Vasquez Andres Humberto",
    "email": "aguzhnayv@uets.edu.ec",
    "cedula": "0000000001",
    "role": "TEACHER" as const,
  },
  {
    "name": "Lalvay Mejia Paul Cesar",
    "email": "plalvaym@uets.edu.ec",
    "cedula": "0000000002",
    "role": "TEACHER" as const,
  },
  {
    "name": "Riera Arce Paulina Jazmin",
    "email": "prieraa@uets.edu.ec",
    "cedula": "0000000003",
    "role": "TEACHER" as const,
  },
  {
    "name": "Otavalo Ordoñez Diana Patricia",
    "email": "dotavaloo@uets.edu.ec",
    "cedula": "0000000004",
    "role": "TEACHER" as const,
  },
  {
    "name": "Mogrovejo Mogrovejo Erick Michael",
    "email": "emogrovejom@uets.edu.ec",
    "cedula": "0000000005",
    "role": "TEACHER" as const,
  },
  {
    "name": "Arias Hugo Catty Marlene",
    "email": "cariash@uets.edu.ec",
    "cedula": "0000000006",
    "role": "TEACHER" as const,
  },
  {
    "name": "Pineda Sangolqui Juan Diego",
    "email": "jpinedas@uets.edu.ec",
    "cedula": "0000000007",
    "role": "TEACHER" as const,
  },
  {
    "name": "Chaca Aguirre Johanna Paola",
    "email": "jchacaa@uets.edu.ec",
    "cedula": "0000000008",
    "role": "TEACHER" as const,
  },
  {
    "name": "Mogrovejo Cabrera Lilia Pamela",
    "email": "lmogrovejoc@uets.edu.ec",
    "cedula": "0000000009",
    "role": "TEACHER" as const,
  },
  {
    "name": "Zambrano Andrade Kevin Andres",
    "email": "kzambranoa@uets.edu.ec",
    "cedula": "0000000010",
    "role": "TEACHER" as const,
  },
  {
    "name": "Puedmag Perez Mayra Viviana",
    "email": "mpuedmagp@uets.edu.ec",
    "cedula": "0000000011",
    "role": "TEACHER" as const,
  },
  {
    "name": "Astudillo Paz Judith Patricia",
    "email": "jastudillop@uets.edu.ec",
    "cedula": "0000000012",
    "role": "TEACHER" as const,
  },
  {
    "name": "Aman Acosta Jefferson Fidel",
    "email": "jamana@uets.edu.ec",
    "cedula": "0000000013",
    "role": "TEACHER" as const,
  },
  {
    "name": "Tenemea Guerrero Julio  Ernesto",
    "email": "jtenemeag@uets.edu.ec",
    "cedula": "0000000014",
    "role": "TEACHER" as const,
  },
  {
    "name": "Alvarez Sacoto Josue Daniel",
    "email": "jalvarezs@uets.edu.ec",
    "cedula": "0000000015",
    "role": "TEACHER" as const,
  },
  {
    "name": "Lima Machuca Braulio Eleodoro",
    "email": "blimam@uets.edu.ec",
    "cedula": "0000000016",
    "role": "TEACHER" as const,
  },
  {
    "name": "Arevalo Sarmiento Maria Jose",
    "email": "marevalos@uets.edu.ec",
    "cedula": "0000000017",
    "role": "TEACHER" as const,
  },
  {
    "name": "Lopez Toledo Diana Victoria",
    "email": "dlopezt@uets.edu.ec",
    "cedula": "0000000018",
    "role": "TEACHER" as const,
  },
  {
    "name": "Faican Faican Christian Fernando",
    "email": "cfaicanf@uets.edu.ec",
    "cedula": "0000000019",
    "role": "TEACHER" as const,
  },
  {
    "name": "Merino Ordoñez Gabriela Elizabeth",
    "email": "gmerinoo@uets.edu.ec",
    "cedula": "0000000020",
    "role": "TEACHER" as const,
  },
  {
    "name": "Garcia Paredes Tatiana Melissa",
    "email": "tgarciap@uets.edu.ec",
    "cedula": "0000000021",
    "role": "TEACHER" as const,
  },
  {
    "name": "Gavilanes Vintimilla Priscila Elizabeth",
    "email": "pgavilanesv@uets.edu.ec",
    "cedula": "0000000022",
    "role": "TEACHER" as const,
  },
  {
    "name": "Cabrera Salazar Maria Jose",
    "email": "mcabreras@uets.edu.ec",
    "cedula": "0000000023",
    "role": "TEACHER" as const,
  },
  {
    "name": "Alvarez Cisneros Omar Antonio",
    "email": "oalvarezc@uets.edu.ec",
    "cedula": "0000000024",
    "role": "TEACHER" as const,
  },
  {
    "name": "Lazo Cordero Victor Manuel",
    "email": "vlazoc@uets.edu.ec",
    "cedula": "0000000025",
    "role": "TEACHER" as const,
  },
  {
    "name": "Bravo Cobos Svetlana Tarcila",
    "email": "sbravoc@uets.edu.ec",
    "cedula": "0000000026",
    "role": "TEACHER" as const,
  },
  {
    "name": "Loyola Illescas Pablo Benjamin",
    "email": "ployolai@uets.edu.ec",
    "cedula": "0000000027",
    "role": "TEACHER" as const,
  },
  {
    "name": "Soliz Sacaquirin Jenny Patricia",
    "email": "jsolizs@uets.edu.ec",
    "cedula": "0000000028",
    "role": "TEACHER" as const,
  },
  {
    "name": "Andrade Rojas Fredi Marcelo",
    "email": "fandrader@uets.edu.ec",
    "cedula": "0000000029",
    "role": "TEACHER" as const,
  },
  {
    "name": "Duran Duran Angelica Maria",
    "email": "adurand@uets.edu.ec",
    "cedula": "0000000030",
    "role": "TEACHER" as const,
  },
  {
    "name": "Espinosa Tacuri Diego  Patricio",
    "email": "despinosat@uets.edu.ec",
    "cedula": "0000000031",
    "role": "TEACHER" as const,
  },
  {
    "name": "Arcentales Aviles Lorena Katherina",
    "email": "larcentalesa@uets.edu.ec",
    "cedula": "0000000032",
    "role": "TEACHER" as const,
  },
  {
    "name": "Mejia Naula Pedro Ivan",
    "email": "pmejian@uets.edu.ec",
    "cedula": "0000000033",
    "role": "TEACHER" as const,
  },
  {
    "name": "Curay Correa Luis Vicente",
    "email": "lcurayc@uets.edu.ec",
    "cedula": "0000000034",
    "role": "TEACHER" as const,
  },
  {
    "name": "Chimborazo Chimborazo Maria De Lourdes",
    "email": "mchimborazoc@uets.edu.ec",
    "cedula": "0000000035",
    "role": "TEACHER" as const,
  },
  {
    "name": "Quinde Lituma Maria Elena",
    "email": "mquindel@uets.edu.ec",
    "cedula": "0000000036",
    "role": "TEACHER" as const,
  },
  {
    "name": "Uchu Jimbo Erika Priscila",
    "email": "euchuj@uets.edu.ec",
    "cedula": "0000000037",
    "role": "TEACHER" as const,
  },
  {
    "name": "Orellana Sigua Martha Graciela",
    "email": "morellanas@uets.edu.ec",
    "cedula": "0000000038",
    "role": "TEACHER" as const,
  },
  {
    "name": "Ortega Lopez Camila Elizabeth",
    "email": "cortegal@uets.edu.ec",
    "cedula": "0000000039",
    "role": "TEACHER" as const,
  },
  {
    "name": "Delgado Landi Santiago Omar",
    "email": "sdelgadol@uets.edu.ec",
    "cedula": "0000000040",
    "role": "TEACHER" as const,
  },
  {
    "name": "Gahona Eras Eduardo Alexander",
    "email": "egahonae@uets.edu.ec",
    "cedula": "0000000041",
    "role": "TEACHER" as const,
  },
  {
    "name": "Velasco Patiño Maria Gabriela",
    "email": "mvelascop@uets.edu.ec",
    "cedula": "0000000042",
    "role": "TEACHER" as const,
  },
  {
    "name": "Muñoz Morocho Camila Elizabeth",
    "email": "cmunozm@uets.edu.ec",
    "cedula": "0000000043",
    "role": "TEACHER" as const,
  },
  {
    "name": "Chasi Pesantes Erika Patricia",
    "email": "echasip@uets.edu.ec",
    "cedula": "0000000044",
    "role": "TEACHER" as const,
  },
  {
    "name": "Nieves Barbecho Maria Elizabeth",
    "email": "mnievesb@uets.edu.ec",
    "cedula": "0000000045",
    "role": "TEACHER" as const,
  },
  {
    "name": "Chafla Berrones Miller Arnaldo",
    "email": "mchaflab@uets.edu.ec",
    "cedula": "0000000046",
    "role": "TEACHER" as const,
  },
  {
    "name": "Coronel Ortega Andres Fernando",
    "email": "acoronelo@uets.edu.ec",
    "cedula": "0000000047",
    "role": "TEACHER" as const,
  },
  {
    "name": "Cardenas Peralta Alex Patricio",
    "email": "acardenasp@uets.edu.ec",
    "cedula": "0000000048",
    "role": "TEACHER" as const,
  },
  {
    "name": "Calle Calle Paul Esteban",
    "email": "pcallec@uets.edu.ec",
    "cedula": "0000000049",
    "role": "TEACHER" as const,
  },
  {
    "name": "Arias Hugo Fabiola Cristina",
    "email": "fariash@uets.edu.ec",
    "cedula": "0000000050",
    "role": "TEACHER" as const,
  },
  {
    "name": "Abad Gavilanes Eduardo Josue",
    "email": "eabadg@uets.edu.ec",
    "cedula": "0000000051",
    "role": "TEACHER" as const,
  },
  {
    "name": "Contreras Ortiz Carlos Felipe",
    "email": "ccontreraso@uets.edu.ec",
    "cedula": "0000000052",
    "role": "TEACHER" as const,
  },
  {
    "name": "Suarez Avila Adrian Sebastian",
    "email": "asuareza@uets.edu.ec",
    "cedula": "0000000053",
    "role": "TEACHER" as const,
  },
  {
    "name": "Ordoñez Matute Freddy Josue",
    "email": "fordonezm@uets.edu.ec",
    "cedula": "0000000054",
    "role": "TEACHER" as const,
  },
  {
    "name": "Cardenas Guaraca Tatiana Dolores",
    "email": "tcardenasg@uets.edu.ec",
    "cedula": "0000000055",
    "role": "TEACHER" as const,
  },
  {
    "name": "Espinoza Pesantez Alberto Sebastian",
    "email": "aespinozap@uets.edu.ec",
    "cedula": "0000000056",
    "role": "TEACHER" as const,
  },
  {
    "name": "Moncayo Ortiz Luis Fernando",
    "email": "lmoncayoo@uets.edu.ec",
    "cedula": "0000000057",
    "role": "TEACHER" as const,
  },
  {
    "name": "Espinoza Cisneros Boris Andres",
    "email": "bespinozac@uets.edu.ec",
    "cedula": "0000000058",
    "role": "TEACHER" as const,
  },
  {
    "name": "Bravo Palacios Carlos Daniel",
    "email": "cbravop@uets.edu.ec",
    "cedula": "0000000059",
    "role": "TEACHER" as const,
  },
  {
    "name": "Espinosa Espinosa Melida Alexandra",
    "email": "mespinosae@uets.edu.ec",
    "cedula": "0000000060",
    "role": "TEACHER" as const,
  },
  {
    "name": "Salazar Ojeda Darwin Ariosto",
    "email": "dsalazaro@uets.edu.ec",
    "cedula": "0000000061",
    "role": "TEACHER" as const,
  },
  {
    "name": "Villegas Vaquen Julia Lorena",
    "email": "jvillegasv@uets.edu.ec",
    "cedula": "0000000062",
    "role": "TEACHER" as const,
  },
  {
    "name": "Padilla Padilla Juan Pablo",
    "email": "jpadillap@uets.edu.ec",
    "cedula": "0000000063",
    "role": "TEACHER" as const,
  },
  {
    "name": "Villavicencio Gutama Daniela Nataly",
    "email": "dvillavicenciog@uets.edu.ec",
    "cedula": "0000000064",
    "role": "TEACHER" as const,
  },
  {
    "name": "Bravo Tacuri Daniela Maria",
    "email": "dbravot@uets.edu.ec",
    "cedula": "0000000065",
    "role": "TEACHER" as const,
  },
  {
    "name": "Sinchi Coronel Christian Andres",
    "email": "csinchic@uets.edu.ec",
    "cedula": "0000000066",
    "role": "TEACHER" as const,
  },
  {
    "name": "Machuca Segovia Franklin Andres",
    "email": "fmachucas@uets.edu.ec",
    "cedula": "0000000067",
    "role": "TEACHER" as const,
  },
  {
    "name": "Carpio Sanchez Kevin Ivan",
    "email": "kcarpios@uets.edu.ec",
    "cedula": "0000000068",
    "role": "TEACHER" as const,
  },
  {
    "name": "Merchan Arizaga Felix Eugenio",
    "email": "fmerchana@uets.edu.ec",
    "cedula": "0000000069",
    "role": "TEACHER" as const,
  },
  {
    "name": "Faican Gomez Cesar Enrique",
    "email": "cfaicang@uets.edu.ec",
    "cedula": "0000000070",
    "role": "TEACHER" as const,
  },
  {
    "name": "Peña Castro David Mauricio",
    "email": "dpenac@uets.edu.ec",
    "cedula": "0000000071",
    "role": "TEACHER" as const,
  },
  {
    "name": "Sigcho Sivisaca Emilce Mariana",
    "email": "esigchos@uets.edu.ec",
    "cedula": "0000000072",
    "role": "TEACHER" as const,
  },
  {
    "name": "Rojas Muñoz Veronica Gabriela",
    "email": "vrojasm@uets.edu.ec",
    "cedula": "0000000073",
    "role": "TEACHER" as const,
  },
  {
    "name": "Castro Rivera Lady Dayanna",
    "email": "lcastror@uets.edu.ec",
    "cedula": "0000000074",
    "role": "TEACHER" as const,
  },
  {
    "name": "Ramon Orellana Guillermo Fernando",
    "email": "gramono@uets.edu.ec",
    "cedula": "0000000075",
    "role": "TEACHER" as const,
  },
  {
    "name": "Feijoo Ponton Juan Fausto",
    "email": "jfeijoop@uets.edu.ec",
    "cedula": "0000000076",
    "role": "TEACHER" as const,
  },
  {
    "name": "Romero Gonzalez Joel Alejandro",
    "email": "jromerog@uets.edu.ec",
    "cedula": "0000000077",
    "role": "TEACHER" as const,
  },
  {
    "name": "Coyago Quito Zulema De Los Angeles",
    "email": "zcoyagoq@uets.edu.ec",
    "cedula": "0000000078",
    "role": "TEACHER" as const,
  },
  {
    "name": "Pinos Reyes Erika Viviana",
    "email": "epinosr@uets.edu.ec",
    "cedula": "0000000079",
    "role": "TEACHER" as const,
  },
  {
    "name": "Verdugo Carvallo Lenny Elizabeth",
    "email": "lverdugoc@uets.edu.ec",
    "cedula": "0000000080",
    "role": "TEACHER" as const,
  },
  {
    "name": "Crespo Sarmiento Ana Lucia",
    "email": "acrespos@uets.edu.ec",
    "cedula": "0000000081",
    "role": "TEACHER" as const,
  },
  {
    "name": "Paucar Roto Mercedes Virgina",
    "email": "mpaucarr@uets.edu.ec",
    "cedula": "0000000082",
    "role": "TEACHER" as const,
  },
  {
    "name": "Toledo Montaleza Mayra Johanna",
    "email": "mtoledom@uets.edu.ec",
    "cedula": "0000000083",
    "role": "TEACHER" as const,
  },
  {
    "name": "Villacis Rivas Gonzalo Rodolfo",
    "email": "gvillacisr@uets.edu.ec",
    "cedula": "0000000084",
    "role": "TEACHER" as const,
  },
  {
    "name": "Ñauta Herrera Maria Gabriela",
    "email": "mnautah@uets.edu.ec",
    "cedula": "0000000085",
    "role": "TEACHER" as const,
  },
  {
    "name": "Narvaez Guajala Daniela Yohanna",
    "email": "dnarvaezg@uets.edu.ec",
    "cedula": "0000000086",
    "role": "TEACHER" as const,
  },
  {
    "name": "Ladines Flores Ana Gabriela",
    "email": "aladinesf@uets.edu.ec",
    "cedula": "0000000087",
    "role": "TEACHER" as const,
  },
  {
    "name": "Guaraca Ortiz Patricia Elizabeth",
    "email": "pguaracao@uets.edu.ec",
    "cedula": "0000000088",
    "role": "TEACHER" as const,
  },
  {
    "name": "Maxi Plaza Ruth Marlene",
    "email": "rmaxip@uets.edu.ec",
    "cedula": "0000000089",
    "role": "TEACHER" as const,
  },
  {
    "name": "Serrano Vicuña Pedro Jacinto",
    "email": "pserranov@uets.edu.ec",
    "cedula": "0000000090",
    "role": "TEACHER" as const,
  },
  {
    "name": "Flores Rodas Pablo Jacinto",
    "email": "pfloresr@uets.edu.ec",
    "cedula": "0000000091",
    "role": "TEACHER" as const,
  },
  {
    "name": "Orellana Vallejo Pedro Jose",
    "email": "porellanav@uets.edu.ec",
    "cedula": "0000000092",
    "role": "TEACHER" as const,
  },
  {
    "name": "Segarra Gordillo Diana Lucia",
    "email": "dsegarrag@uets.edu.ec",
    "cedula": "0000000093",
    "role": "TEACHER" as const,
  },
  {
    "name": "Farfan Pacheco Adolfo Abel",
    "email": "afarfanp@uets.edu.ec",
    "cedula": "0000000094",
    "role": "TEACHER" as const,
  },
  {
    "name": "Lema Acosta Jessica Catalina",
    "email": "jlemaa@uets.edu.ec",
    "cedula": "0000000095",
    "role": "TEACHER" as const,
  },
  {
    "name": "Sarango Ulloa Mayra Fernanda",
    "email": "msarangou@uets.edu.ec",
    "cedula": "0000000096",
    "role": "TEACHER" as const,
  },
  {
    "name": "Lazo Alvarez Erika Michelle",
    "email": "elazoa@uets.edu.ec",
    "cedula": "0000000097",
    "role": "TEACHER" as const,
  },
  {
    "name": "Ulloa Almeida David Fernando",
    "email": "dulloaa@uets.edu.ec",
    "cedula": "0000000098",
    "role": "TEACHER" as const,
  },
  {
    "name": "Ruiz Chacon Byron Geovany",
    "email": "bruizc@uets.edu.ec",
    "cedula": "0000000099",
    "role": "TEACHER" as const,
  },
  {
    "name": "Orellana Sigua Evelyn Carolina",
    "email": "eorellanas@uets.edu.ec",
    "cedula": "0000000100",
    "role": "TEACHER" as const,
  },
  {
    "name": "Espinoza Mejia Evelyn Nataly",
    "email": "eespinozam@uets.edu.ec",
    "cedula": "0000000101",
    "role": "TEACHER" as const,
  },
  {
    "name": "Orellana Rios Geovanna Jacqueline",
    "email": "gorellanar@uets.edu.ec",
    "cedula": "0000000102",
    "role": "TEACHER" as const,
  },
  {
    "name": "Pulla Quito Jorge Rosendo",
    "email": "jpullaq@uets.edu.ec",
    "cedula": "0000000103",
    "role": "TEACHER" as const,
  },
  {
    "name": "Paez Chalco Martin Alfonso",
    "email": "mpaezchalco@uets.edu.ec",
    "cedula": "0000000104",
    "role": "TEACHER" as const,
  },
  {
    "name": "Espinoza Ambrosi Mirian Marcela",
    "email": "mespinozaa@uets.edu.ec",
    "cedula": "0000000105",
    "role": "TEACHER" as const,
  },
  {
    "name": "Saldaña Merchan Ana Lorena",
    "email": "asaldanam@uets.edu.ec",
    "cedula": "0000000106",
    "role": "TEACHER" as const,
  },
  {
    "name": "Bustamante Inga Carlos Rodolfo",
    "email": "cbustamantei@uets.edu.ec",
    "cedula": "0000000107",
    "role": "TEACHER" as const,
  },
  {
    "name": "Peralta Orellana Patricio Esteban",
    "email": "pperaltao@uets.edu.ec",
    "cedula": "0000000108",
    "role": "TEACHER" as const,
  },
  {
    "name": "Astudillo Delgado Wilson Francisco",
    "email": "wastudillod@uets.edu.ec",
    "cedula": "0000000109",
    "role": "TEACHER" as const,
  },
  {
    "name": "Paez Cardenas Mauricio Xavier",
    "email": "mpaezcard@uets.edu.ec",
    "cedula": "0000000110",
    "role": "TEACHER" as const,
  },
  {
    "name": "Bravo Mosquera Jimmy Patricio",
    "email": "jbravom@uets.edu.ec",
    "cedula": "0000000111",
    "role": "TEACHER" as const,
  },
  {
    "name": "Izquierdo Toledo Ana Paula",
    "email": "aizquierdot@uets.edu.ec",
    "cedula": "0000000112",
    "role": "TEACHER" as const,
  },
  {
    "name": "Torres Alvarez Mateo Nicolas",
    "email": "mtorresa@uets.edu.ec",
    "cedula": "0000000113",
    "role": "TEACHER" as const,
  },
  {
    "name": "Padilla Romero Jorge Luis",
    "email": "jpadillar@uets.edu.ec",
    "cedula": "0000000114",
    "role": "TEACHER" as const,
  },
  {
    "name": "Justicia Hurtado Maritza Frined",
    "email": "mjusticiah@uets.edu.ec",
    "cedula": "0000000115",
    "role": "TEACHER" as const,
  },
  {
    "name": "Bernal Reino Maria De Los Angeles",
    "email": "mbernalr@uets.edu.ec",
    "cedula": "0000000116",
    "role": "TEACHER" as const,
  },
  {
    "name": "Sanmartin Guzman Cristopher Xavier",
    "email": "csanmarting@uets.edu.ec",
    "cedula": "0000000117",
    "role": "TEACHER" as const,
  },
  {
    "name": "Velasquez Guerrero Milton Isaac",
    "email": "mvelasquezg@uets.edu.ec",
    "cedula": "0000000118",
    "role": "TEACHER" as const,
  },
  {
    "name": "Zavala Palomeque Paul Andres",
    "email": "pzavalap@uets.edu.ec",
    "cedula": "0000000119",
    "role": "TEACHER" as const,
  },
  {
    "name": "Montero Bermeo Jessenia Gabriela",
    "email": "jmonterob@uets.edu.ec",
    "cedula": "0000000120",
    "role": "TEACHER" as const,
  },


  {
  name: "Alvarado Bonilla Maria Ximena",
  email: "malvaradob@uets.edu.ec",
  cedula: "0000000195",
  role: "TEACHER" as const,
},
{
  name: "Quito Guiracocha Jessica Margarita",
  email: "jquitog@uets.edu.ec",
  cedula: "0000000122",
  role: "TEACHER" as const,
},
{
  name: "Flores Tola Maria Jose",
  email: "mflorest@uets.edu.ec",
  cedula: "0000000123",
  role: "TEACHER" as const,
},
{
  name: "Quito Quito Diana Janeth",
  email: "dquitoq@uets.edu.ec",
  cedula: "0000000124",
  role: "TEACHER" as const,
},
{
  name: "Leon Velez Daniela Cecilia",
  email: "dleonv@uets.edu.ec",
  cedula: "0000000125",
  role: "TEACHER" as const,
},
{
  name: "Guaman Barba Paulina Maribel",
  email: "pguamanb@uets.edu.ec",
  cedula: "0000000126",
  role: "TEACHER" as const,
},
{
  name: "Neira Maldonado Karla Maria",
  email: "kneiram@uets.edu.ec",
  cedula: "0000000127",
  role: "TEACHER" as const,
},
{
  name: "Segovia Alvarez Maria De La Paz",
  email: "msegoviaa@uets.edu.ec",
  cedula: "0000000128",
  role: "TEACHER" as const,
},
{
  name: "Sanchez Sanmartin Andrea Ximena",
  email: "asanchezs@uets.edu.ec",
  cedula: "0000000129",
  role: "TEACHER" as const,
},
{
  name: "Lopez Toledo Blanca Elisa",
  email: "blopezt@uets.edu.ec",
  cedula: "0000000130",
  role: "TEACHER" as const,
},
{
  name: "Quizhpilema Zhagui Jennifer Alexandra",
  email: "jquizhpilemaz@uets.edu.ec",
  cedula: "0000000131",
  role: "TEACHER" as const,
},
{
  name: "Rosas Marquez Juan Francisco",
  email: "jrosasm@uets.edu.ec",
  cedula: "0000000132",
  role: "TEACHER" as const,
},
{
  name: "Capelo Nadia",
  email: "ncapelo@uets.edu.ec",
  cedula: "0000000133",
  role: "TEACHER" as const,
},
{
  name: "Quezada Bermeo Sandra Juanita",
  email: "squezadab@uets.edu.ec",
  cedula: "0000000134",
  role: "TEACHER" as const,
},
{
  name: "Fajardo Heredia Maria Elisa",
  email: "mfajardoh@uets.edu.ec",
  cedula: "0000000135",
  role: "TEACHER" as const,
},
{
  name: "Gutierrez Gonzales Washington Santiago",
  email: "wgutierrezg@uets.edu.ec",
  cedula: "0000000136",
  role: "TEACHER" as const,
},
{
  name: "Juca Sarate Dario Xavier",
  email: "djucas@uets.edu.ec",
  cedula: "0000000137",
  role: "TEACHER" as const,
},
{
  name: "Zhiñin Guaman Sthefani Paola",
  email: "szhiñing@uets.edu.ec",
  cedula: "0000000138",
  role: "TEACHER" as const,
},
{
  name: "Guaman Arcentales Angel Freddy",
  email: "gguamana@uets.edu.ec",
  cedula: "0000000139",
  role: "TEACHER" as const,
},
{
  name: "Mendez Mendez Kevin Fernando",
  email: "kmendezm@uets.edu.ec",
  cedula: "0000000140",
  role: "TEACHER" as const,
},
{
  name: "Arevalo Vimos Christian Paul",
  email: "carevalov@uets.edu.ec",
  cedula: "0000000141",
  role: "TEACHER" as const,
},
{
  name: "Guzhñay Llivisaca Zoila Liliana",
  email: "zguzhñayl@uets.edu.ec",
  cedula: "0000000142",
  role: "TEACHER" as const,
},
{
  name: "Iñiguez Aguila Jassenia Petita",
  email: "jiñigueza@uets.edu.ec",
  cedula: "0000000143",
  role: "TEACHER" as const,
},
{
  name: "Bustillos Hernandez Silvia Lorena",
  email: "sbustillosh@uets.edu.ec",
  cedula: "0000000144",
  role: "TEACHER" as const,
},
{
  name: "Galarza Duran Maria Gabriela",
  email: "mgalarzad@uets.edu.ec",
  cedula: "0000000145",
  role: "TEACHER" as const,
},
{
  name: "Suqui Palaguachi Jessica Elizabeth",
  email: "jsuquip@uets.edu.ec",
  cedula: "0000000146",
  role: "TEACHER" as const,
},
{
  name: "Maldonado Ramon Maricela Veronica",
  email: "mmaldonador@uets.edu.ec",
  cedula: "0000000147",
  role: "TEACHER" as const,
},
{
  name: "Faican Coronel Janeth Eufemia",
  email: "jfaicanc@uets.edu.ec",
  cedula: "0000000148",
  role: "TEACHER" as const,
},
{
  name: "Erraez Sanmartin Emilia Salome",
  email: "eerraezs@uets.edu.ec",
  cedula: "0000000149",
  role: "TEACHER" as const,
},
{
  name: "Calle Reinoso Fernanda",
  email: "fcaller@uets.edu.ec",
  cedula: "0000000150",
  role: "TEACHER" as const,
},
{
  name: "Astudillo Roman Armando Marlo",
  email: "aastudilloroman@uets.edu.ec",
  cedula: "0000000151",
  role: "TEACHER" as const,
},
{
  name: "Ramirez Maridueña Jefferson",
  email: "jramirezm@uets.edu.ec",
  cedula: "0000000152",
  role: "TEACHER" as const,
},
{
  name: "Villa Tacuri Alfonso Gerardo",
  email: "avillat@uets.edu.ec",
  cedula: "0000000153",
  role: "TEACHER" as const,
},
{
  name: "Sanchez Quito Mariela Alexandra",
  email: "msanchezq@uets.edu.ec",
  cedula: "0000000154",
  role: "TEACHER" as const,
},
{
  name: "Alvarez Vasquez Yustin Johanna",
  email: "yalvarezv@uets.edu.ec",
  cedula: "0000000155",
  role: "TEACHER" as const,
},
{
  name: "Yanza Guzman Sonia Carola",
  email: "syanzag@uets.edu.ec",
  cedula: "0000000156",
  role: "TEACHER" as const,
},
{
  name: "Soto Jimenez Carlos Salomon",
  email: "csotoj@uets.edu.ec",
  cedula: "0000000157",
  role: "TEACHER" as const,
},
{
  name: "Parra Guerrero Wilmer",
  email: "wparrag@uets.edu.ec",
  cedula: "0000000158",
  role: "TEACHER" as const,
},
{
  name: "Medina Zambrano Yarith Doreivy",
  email: "mmedinaz@uets.edu.ec",
  cedula: "0000000159",
  role: "TEACHER" as const,
},
{
  name: "Garcia Illescas Jaqueline Elizabeth",
  email: "ggarciai@uets.edu.ec",
  cedula: "0000000160",
  role: "TEACHER" as const,
},
{
  name: "Pacheco Padilla Adriana Karina",
  email: "apachecop@uets.edu.ec",
  cedula: "0000000161",
  role: "TEACHER" as const,
},
{
  name: "Brito Carmona Jessica Laura",
  email: "jbritoc@uets.edu.ec",
  cedula: "0000000162",
  role: "TEACHER" as const,
},
{
  name: "Fajardo Guapisaca Mercy Marlene",
  email: "mfajardog@uets.edu.ec",
  cedula: "0000000163",
  role: "TEACHER" as const,
},
{
  name: "Garcia Sanchez Milton Eduardo",
  email: "mgarcias@uets.edu.ec",
  cedula: "0000000165",
  role: "TEACHER" as const,
},
{
  name: "Pesantez Adriana Cecibel",
  email: "apesantez@uets.edu.ec",
  cedula: "0000000166",
  role: "TEACHER" as const,
},
{
  name: "Pillco Guaman Freddy Mauricio",
  email: "fpillcog@uets.edu.ec",
  cedula: "0000000167",
  role: "TEACHER" as const,
},
{
  name: "Contreras Leon Freddy Santiago",
  email: "fcontrerasl@uets.edu.ec",
  cedula: "0000000168",
  role: "TEACHER" as const,
},
{
  name: "Avila Duran Domenica Lizbeth",
  email: "aavilad@uets.edu.ec",
  cedula: "0000000169",
  role: "TEACHER" as const,
},
{
  name: "Abad Arcalle Juan Jose",
  email: "jabada@uets.edu.ec",
  cedula: "0000000170",
  role: "TEACHER" as const,
},
{
  name: "Ortiz Cuji Aldo Santiago",
  email: "oortizc@uets.edu.ec",
  cedula: "0000000171",
  role: "TEACHER" as const,
},
{
  name: "Guaman Gomez Boris Holger",
  email: "bguamang@uets.edu.ec",
  cedula: "0000000172",
  role: "TEACHER" as const,
},
{
  name: "Astudillo Cabrera Carla Vanessa",
  email: "castudilloc@uets.edu.ec",
  cedula: "0000000173",
  role: "TEACHER" as const,
},
{
  name: "Cardenas Cardenas Mayra Beatriz",
  email: "mcardenasc@uets.edu.ec",
  cedula: "0000000174",
  role: "TEACHER" as const,
},
{
  name: "Viteri Gomez Nancy Mercedes",
  email: "nviterig@uets.edu.ec",
  cedula: "0000000175",
  role: "TEACHER" as const,
},
{
  name: "Pesantez Urgiles Santiago",
  email: "spesantezu@uets.edu.ec",
  cedula: "0000000176",
  role: "TEACHER" as const,
},
{
  name: "Avila Paucar Johanna Elizabeth",
  email: "aavilap@uets.edu.ec",
  cedula: "0000000177",
  role: "TEACHER" as const,
},
{
  name: "Aucay Velepucha Digna Isabel",
  email: "daucayv@uets.edu.ec",
  cedula: "0000000178",
  role: "TEACHER" as const,
},
{
  name: "Cardenas Quito Rheni Elizabeth",
  email: "rcardenasq@uets.edu.ec",
  cedula: "0000000179",
  role: "TEACHER" as const,
},
{
  name: "Astudillo Roman Marcia Eugenia",
  email: "aastudillomarc@uets.edu.ec",
  cedula: "0000000180",
  role: "TEACHER" as const,
},
{
  name: "Hugo Gomez Nancy Lucia",
  email: "nhugog@uets.edu.ec",
  cedula: "0000000181",
  role: "TEACHER" as const,
},
{
  name: "Cabrera Landi Silvia Fabiola",
  email: "scabreral@uets.edu.ec",
  cedula: "0000000182",
  role: "TEACHER" as const,
},
{
  name: "Carpio Espinoza Pablo Gabriel",
  email: "pcarpioe@uets.edu.ec",
  cedula: "0000000183",
  role: "TEACHER" as const,
},
{
  name: "Bermeo Alvarez Irma De Lourdes",
  email: "ibermeoa@uets.edu.ec",
  cedula: "0000000184",
  role: "TEACHER" as const,
},
{
  name: "Chuchuca Saquinaula Diego Andres",
  email: "dchuchucas@uets.edu.ec",
  cedula: "0000000185",
  role: "TEACHER" as const,
},
{
  name: "P David De La Cruz",
  email: "pdelacruz@uets.edu.ec",
  cedula: "0000000186",
  role: "TEACHER" as const,
},
{
  name: "Mejia Perez Laura Gabriela",
  email: "lmejiap@uets.edu.ec",
  cedula: "0000000187",
  role: "TEACHER" as const,
},
{
  name: "Avila Lopez Ana Esperanza",
  email: "aavilal@uets.edu.ec",
  cedula: "0000000188",
  role: "TEACHER" as const,
},
{
  name: "Solano Palacios Diana Lucia",
  email: "dsolanop@uets.edu.ec",
  cedula: "0000000189",
  role: "TEACHER" as const,
},
{
  name: "Pauta Vera Diana Elizabeth",
  email: "dpautav@uets.edu.ec",
  cedula: "0000000190",
  role: "TEACHER" as const,
},
{
  name: "Cando Viri Tania Marcela",
  email: "ccandov@uets.edu.ec",
  cedula: "0000000191",
  role: "TEACHER" as const,
},
{
  name: "Mogrovejo Avila Dayanna Mireya",
  email: "mmogrovejoa@uets.edu.ec",
  cedula: "0000000192",
  role: "TEACHER" as const,
}
];

async function main() {
  // Pre-check: detectar emails duplicados en la lista
  const emailCount = new Map<string, string[]>();
  for (const u of USERS) {
    const list = emailCount.get(u.email) ?? [];
    list.push(u.name);
    emailCount.set(u.email, list);
  }
  for (const [email, names] of emailCount) {
    if (names.length > 1) {
      console.warn(`⚠ Email duplicado en la lista: ${email} → ${names.join(" / ")}`);
    }
  }

  const failed: { name: string; email: string; cedula: string; error: string }[] = [];

  for (const u of USERS) {
    try {
      const passwordHash = await bcrypt.hash(u.cedula, 10);

      // Buscar por email O por cédula para detectar conflictos antes de crear
      const existing = await (prisma as unknown as {
        user: { findFirst: (args: unknown) => Promise<{ id: string; email: string; cedula: string; name: string } | null> };
      }).user.findFirst({
        where: { OR: [{ email: u.email }, { cedula: u.cedula }] },
        select: { id: true, email: true, cedula: true, name: true },
      });

      if (existing) {
        if (existing.email === u.email && existing.cedula === u.cedula) {
          console.log(`→ Ya existe: ${u.name} <${u.email}>`);
        } else if (existing.email === u.email) {
          console.warn(`⚠ Email ya en uso por otro usuario: ${u.email} (${existing.name}, cédula ${existing.cedula}) — saltando "${u.name}"`);
        } else {
          console.warn(`⚠ Cédula ${u.cedula} ya en uso por: ${existing.name} <${existing.email}> — saltando "${u.name}"`);
        }
        continue;
      }

      const user = await prisma.user.create({
        data: {
          name:                u.name,
          email:               u.email,
          cedula:              u.cedula,
          passwordHash,
          role:                u.role,
          forcePasswordChange: true,
          isActive:            true,
        },
      });
      console.log(`✓ ${user.role} creado: ${user.name} <${user.email}>`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`✗ Falló "${u.name}" <${u.email}> (cédula ${u.cedula}): ${msg}`);
      failed.push({ name: u.name, email: u.email, cedula: u.cedula, error: msg });
    }
  }

  if (failed.length) {
    console.error(`\n── ${failed.length} usuario(s) con conflicto ──`);
    for (const f of failed) {
      console.error(`  • ${f.name} <${f.email}> cédula=${f.cedula}`);
    }
  } else {
    console.log("\n✓ Todos los usuarios procesados correctamente.");
  }
}

main()
  .catch((e) => { console.error("✗ Error fatal:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
