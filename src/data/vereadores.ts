// Dados dos Vereadores da 18ª Legislatura (2025-2028) da Câmara Municipal de São Paulo
// Fonte: API SP Legis (https://saopaulo.sp.leg.br/vereadores-json/)
// IDs baseados em slug para compatibilidade com Edge Functions

export interface Vereador {
  id: string;
  name: string;
  party: string;
  photo: string;
  phone: string;
  email: string;
  region?: string;
  initials: string;
  sala?: string;
  andar?: string;
  gv?: string;
  isLeader?: boolean;
  isGovernmentLeader?: boolean;
  isSubstitute?: boolean;
  isOnLeave?: boolean;
}

// Fallback local - 55 vereadores ativos (atualizado via API SP Legis)
export const vereadores: Vereador[] = [
  {
    id: "adrilles-jorge",
    name: "Adrilles Jorge",
    party: "UNIAO",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2024/11/adrilles_2025.jpg",
    phone: "(11) 3396-4303",
    email: "adrillesreisjorge@saopaulo.sp.leg.br",
    initials: "AJ",
    sala: "607",
    gv: "01º GV"
  },
  {
    id: "alessandro-guedes",
    name: "Alessandro Guedes",
    party: "PT",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2017/01/ale_guedes_2025.jpg",
    phone: "(11) 3396-4875",
    email: "alessandroguedes@saopaulo.sp.leg.br",
    initials: "AG",
    sala: "606",
    andar: "6º",
    gv: "04º GV"
  },
  {
    id: "amanda-paschoal",
    name: "Amanda Paschoal",
    party: "PSOL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2024/11/amanda_paschoal_2025.jpg",
    phone: "(11) 3396-4401",
    email: "amandapaschoal@saopaulo.sp.leg.br",
    initials: "AP",
    sala: "1015",
    gv: "05º GV"
  },
  {
    id: "amanda-vettorazzo",
    name: "Amanda Vettorazzo",
    party: "UNIAO",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2024/11/amanda_vetorazzo_2025-1.jpg",
    phone: "(11) 3396-4860",
    email: "amandavettorazzo@saopaulo.sp.leg.br",
    initials: "AV",
    sala: "510",
    gv: "08º GV"
  },
  {
    id: "ana-carolina-oliveira",
    name: "Ana Carolina Oliveira",
    party: "PODE",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2024/11/ana_carolina_2025-1.jpg",
    phone: "(11) 3396-5035",
    email: "anacarolinaoliveira@saopaulo.sp.leg.br",
    initials: "AO",
    sala: "404",
    gv: "12º GV"
  },
  {
    id: "andre-santos",
    name: "André Santos",
    party: "Republicanos",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2017/01/andre_santos_2025.jpg",
    phone: "(11) 3396-4461",
    email: "andresantos@saopaulo.sp.leg.br",
    initials: "AS",
    sala: "504",
    andar: "5°",
    gv: "07º GV"
  },
  {
    id: "carlos-bezerra-jr",
    name: "Carlos Bezerra Jr.",
    party: "PSD",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2021/01/carlos_bezerra-1.jpg",
    phone: "(11) 3396-4469",
    email: "carlosbezerrajr@saopaulo.sp.leg.br",
    initials: "CJ",
    sala: "1107",
    gv: "38º GV",
    isSubstitute: true
  },
  {
    id: "celso-giannazi",
    name: "Celso Giannazi",
    party: "PSOL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/celso_gianazi_2025.jpg",
    phone: "(11) 3396-4305",
    email: "celsogiannazi@saopaulo.sp.leg.br",
    initials: "CG",
    sala: "704",
    andar: "7º",
    gv: "43º GV"
  },
  {
    id: "cris-monteiro",
    name: "Cris Monteiro",
    party: "NOVO",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/cris_monteiro_2025.jpg",
    phone: "(11) 3396-4885",
    email: "crismonteiro@saopaulo.sp.leg.br",
    initials: "CM",
    sala: "420",
    andar: "5º",
    gv: "10º GV",
    isLeader: true
  },
  {
    id: "danilo-do-posto-de-saude",
    name: "Danilo do Posto de Saúde",
    party: "PODE",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/danilo_2025.jpg",
    phone: "(11) 3396-4213",
    email: "danilodoposto@saopaulo.sp.leg.br",
    initials: "DS",
    sala: "709",
    andar: "7º",
    gv: "11º GV"
  },
  {
    id: "dheison-silva",
    name: "Dheison Silva",
    party: "PT",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2024/11/dheison_2025.jpg",
    phone: "(11) 3396-4605",
    email: "dheisonsilva@saopaulo.sp.leg.br",
    initials: "DS",
    sala: "509",
    gv: "13º GV"
  },
  {
    id: "dr-milton-ferreira",
    name: "Dr. Milton Ferreira",
    party: "PODE",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2017/01/milton_2024.jpg",
    phone: "(11) 3396-4267",
    email: "drmiltonferreira@saopaulo.sp.leg.br",
    initials: "DF",
    sala: "714",
    andar: "7º",
    gv: "06º GV"
  },
  {
    id: "dr-murillo-lima",
    name: "Dr. Murillo Lima",
    party: "PP",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2024/11/dr-murillo-lima.jpg",
    phone: "(11) 3396-4629",
    email: "drmurillolima@saopaulo.sp.leg.br",
    initials: "DL",
    sala: "611",
    gv: "14º GV",
    isLeader: true
  },
  {
    id: "dra-sandra-tadeu",
    name: "Dra. Sandra Tadeu",
    party: "PARTIDO LIBERAL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2014/10/dra_sandra_2025.jpg",
    phone: "(11) 3396-4244",
    email: "sandratadeu@saopaulo.sp.leg.br",
    initials: "DT",
    sala: "716",
    andar: "7º",
    gv: "44º GV",
    isLeader: true
  },
  {
    id: "edir-sales",
    name: "Edir Sales",
    party: "PSD",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/edir_salles_2025.jpg",
    phone: "(11) 3396-4309",
    email: "edirsales@saopaulo.sp.leg.br",
    initials: "ES",
    sala: "1014",
    andar: "10º",
    gv: "32º GV"
  },
  {
    id: "eliseu-gabriel",
    name: "Eliseu Gabriel",
    party: "PSB",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/eliseu_gabriel_2025.jpg",
    phone: "(11) 3396-4403",
    email: "eliseugabriel@saopaulo.sp.leg.br",
    initials: "EG",
    sala: "623",
    andar: "6º",
    gv: "53º GV",
    isLeader: true
  },
  {
    id: "ely-teruel",
    name: "Ely Teruel",
    party: "MDB",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2021/01/teruel_2024-1.jpg",
    phone: "(11) 3396-4300",
    email: "elyteruel@saopaulo.sp.leg.br",
    initials: "ET",
    sala: "507",
    andar: "5º",
    gv: "15º GV"
  },
  {
    id: "fabio-riva",
    name: "Fabio Riva",
    party: "MDB",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2017/01/fabio-riva.png",
    phone: "(11) 3396-4805",
    email: "vereadorfabioriva@saopaulo.sp.leg.br",
    initials: "FR",
    sala: "1005",
    andar: "10º",
    gv: "18º GV",
    isGovernmentLeader: true
  },
  {
    id: "gabriel-abreu",
    name: "Gabriel Abreu",
    party: "PODE",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/gabriel_abreu_2025.jpg",
    phone: "(11) 3396-4524",
    email: "gabrielabreu@saopaulo.sp.leg.br",
    initials: "GA",
    sala: "710",
    gv: "19º GV"
  },
  {
    id: "george-hato",
    name: "George Hato",
    party: "MDB",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2014/10/hato_2025.jpg",
    phone: "(11) 3396-4298",
    email: "gvhato@saopaulo.sp.leg.br",
    initials: "GH",
    sala: "517",
    andar: "5º",
    gv: "16º GV"
  },
  {
    id: "gilberto-nascimento",
    name: "Gilberto Nascimento",
    party: "PARTIDO LIBERAL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/gilberto_2025.jpg",
    phone: "(11) 3396-4405",
    email: "vereadorgilbertonascimento@saopaulo.sp.leg.br",
    initials: "GN",
    sala: "1109",
    andar: "11º",
    gv: "22º GV"
  },
  {
    id: "helio-rodrigues",
    name: "Hélio Rodrigues",
    party: "PT",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2017/10/vereador-helio-rodrigues.jpg",
    phone: "(11) 3396-4315",
    email: "heliorodrigues@saopaulo.sp.leg.br",
    initials: "HR",
    sala: "408",
    andar: "4º",
    gv: "50º GV"
  },
  {
    id: "isac-felix",
    name: "Isac Félix",
    party: "PARTIDO LIBERAL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/isac_felix_2025.jpg",
    phone: "(11) 3396-4406",
    email: "vereadorisacfelix@saopaulo.sp.leg.br",
    initials: "IF",
    sala: "1120",
    andar: "11º",
    gv: "09º GV"
  },
  {
    id: "jair-tatto",
    name: "Jair Tatto",
    party: "PT",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2014/10/jair_2024.jpg",
    phone: "(11) 3396-4294",
    email: "jairtatto@saopaulo.sp.leg.br",
    initials: "JT",
    sala: "1018",
    andar: "10º",
    gv: "17º GV"
  },
  {
    id: "janaina-paschoal",
    name: "Janaina Paschoal",
    party: "PP",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/janaina_paschoal_2025.jpg",
    phone: "(11) 3396-4233",
    email: "janainapaschoal@saopaulo.sp.leg.br",
    initials: "JP",
    sala: "421",
    gv: "29º GV"
  },
  {
    id: "joao-ananias",
    name: "João Ananias",
    party: "PT",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2023/03/joao_ananias_2025.jpg",
    phone: "(11) 3396-4290",
    email: "joaoananias@saopaulo.sp.leg.br",
    initials: "JA",
    sala: "619",
    andar: "6º",
    gv: "02º GV"
  },
  {
    id: "joao-jorge",
    name: "João Jorge",
    party: "MDB",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/joao_jorge_2025.jpg",
    phone: "(11) 3396-4254",
    email: "joaojorge@saopaulo.sp.leg.br",
    initials: "JJ",
    sala: "307",
    andar: "3º",
    gv: "31º GV"
  },
  {
    id: "keit-lima",
    name: "Keit Lima",
    party: "PSOL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2024/11/Keit-Lima.jpg",
    phone: "(11) 3396-4815",
    email: "keitlima@saopaulo.sp.leg.br",
    initials: "KL",
    sala: "515",
    gv: "21º GV",
    isLeader: true
  },
  {
    id: "kenji-ito",
    name: "Kenji Ito",
    party: "PODE",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2024/11/kenji_2025.jpg",
    phone: "(11) 3396-4947",
    email: "kenjiito@saopaulo.sp.leg.br",
    initials: "KI",
    sala: "618",
    gv: "23º GV",
    isLeader: true
  },
  {
    id: "luana-alves",
    name: "Luana Alves",
    party: "PSOL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/luana_2025.jpg",
    phone: "(11) 3396-4525",
    email: "luanaalvesvereadora@saopaulo.sp.leg.br",
    initials: "LA",
    sala: "1006",
    andar: "10º",
    gv: "26º GV"
  },
  {
    id: "lucas-pavanato",
    name: "Lucas Pavanato",
    party: "PARTIDO LIBERAL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/lucas_2025.jpg",
    phone: "(11) 3396-4390",
    email: "assessoriapavanato@gmail.com",
    initials: "LP",
    sala: "1117",
    gv: "20º GV"
  },
  {
    id: "luna-zarattini",
    name: "Luna Zarattini",
    party: "PT",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/luna_2025.jpg",
    phone: "(11) 3396-4236",
    email: "lunazarattini@saopaulo.sp.leg.br",
    initials: "LZ",
    sala: "417",
    andar: "4º",
    gv: "27º GV",
    isLeader: true
  },
  {
    id: "major-palumbo",
    name: "Major Palumbo",
    party: "PP",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2024/11/major_2025.jpg",
    phone: "(11) 3396-4542",
    email: "bombeiromajorpalumbo@saopaulo.sp.leg.br",
    initials: "MP",
    sala: "1114",
    andar: "11",
    gv: "03º GV"
  },
  {
    id: "marcelo-messias",
    name: "Marcelo Messias",
    party: "MDB",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2021/01/marcelo_2024-1.jpg",
    phone: "(11) 3396-4063",
    email: "marcelomessias@saopaulo.sp.leg.br",
    initials: "MM",
    sala: "908",
    andar: "9º",
    gv: "28º GV",
    isLeader: true
  },
  {
    id: "marina-bragante",
    name: "Marina Bragante",
    party: "Rede Sustentabilidade",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/marina_2025.jpg",
    phone: "(11) 3396-4664",
    email: "marinabragante@saopaulo.sp.leg.br",
    initials: "MB",
    sala: "308",
    gv: "42º GV",
    isLeader: true
  },
  {
    id: "nabil-bonduki",
    name: "Nabil Bonduki",
    party: "PT",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/nabil_2025.jpg",
    phone: "(11) 3396-4306",
    email: "nabilbonduki@saopaulo.sp.leg.br",
    initials: "NB",
    sala: "1105",
    gv: "45º GV"
  },
  {
    id: "pastora-sandra-alves",
    name: "Pastora Sandra Alves",
    party: "UNIAO",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2024/11/pastora-sandra-alves-2025.jpg",
    phone: "(11) 3396-4310",
    email: "pastorasandraalves@saopaulo.sp.leg.br",
    initials: "PA",
    sala: "721",
    gv: "35º GV"
  },
  {
    id: "paulo-frange",
    name: "Paulo Frange",
    party: "MDB",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2014/10/frange_2025.jpg",
    phone: "(11) 3396-4428",
    email: "paulofrange@saopaulo.sp.leg.br",
    initials: "PF",
    sala: "514",
    andar: "11º",
    gv: "24º GV"
  },
  {
    id: "professor-toninho-vespoli",
    name: "Professor Toninho Vespoli",
    party: "PSOL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/professor_toninho_2025.jpg",
    phone: "(11) 3396-4655",
    email: "toninhovespoli@saopaulo.sp.leg.br",
    initials: "PV",
    sala: "1116",
    andar: "11º",
    gv: "49º GV"
  },
  {
    id: "renata-falzoni",
    name: "Renata Falzoni",
    party: "PSB",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/renata_2025.jpg",
    phone: "(11) 3396-4341",
    email: "renatafalzoni@saopaulo.sp.leg.br",
    initials: "RF",
    sala: "304",
    gv: "36º GV"
  },
  {
    id: "ricardo-teixeira",
    name: "Ricardo Teixeira",
    party: "UNIAO",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/ricardo_teixeira_2025.jpg",
    phone: "(11) 3396-4463",
    email: "ricardoteixeira@saopaulo.sp.leg.br",
    initials: "RT",
    sala: "320",
    andar: "3º",
    gv: "55º GV"
  },
  {
    id: "roberto-tripoli",
    name: "Roberto Tripoli",
    party: "PV",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/tripoli_2025.jpg",
    phone: "(11) 3396-4217",
    email: "tripoli@saopaulo.sp.leg.br",
    initials: "RT",
    sala: "423",
    andar: "4º",
    gv: "25º GV",
    isLeader: true
  },
  {
    id: "rubinho-nunes",
    name: "Rubinho Nunes",
    party: "UNIAO",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2021/01/rubinho_2025.jpg",
    phone: "(11) 3396-4618",
    email: "rubinhonunes@saopaulo.sp.leg.br",
    initials: "RN",
    sala: "1109",
    andar: "11º",
    gv: "37º GV"
  },
  {
    id: "rute-costa",
    name: "Rute Costa",
    party: "PARTIDO LIBERAL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2017/01/rute-costa.jpg",
    phone: "(11) 3396-4238",
    email: "rutecosta@saopaulo.sp.leg.br",
    initials: "RC",
    sala: "1017",
    andar: "10º",
    gv: "30º GV"
  },
  {
    id: "sandra-santana",
    name: "Sandra Santana",
    party: "MDB",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/sandra_santana_2025.jpg",
    phone: "(11) 3396-4444",
    email: "sandrasantana@saopaulo.sp.leg.br",
    initials: "SS",
    sala: "610",
    andar: "6º",
    gv: "39º GV"
  },
  {
    id: "sansao-pereira",
    name: "Sansão Pereira",
    party: "Republicanos",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2021/01/sansao_2025-2.jpg",
    phone: "(11) 3396-5034",
    email: "sansaopereira@saopaulo.sp.leg.br",
    initials: "SP",
    sala: "616",
    andar: "6º",
    gv: "41º GV",
    isLeader: true
  },
  {
    id: "sargento-nantes",
    name: "Sargento Nantes",
    party: "PP",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2024/11/sargento_2025-1.jpg",
    phone: "(11) 3396-4264",
    email: "sargentonantes@saopaulo.sp.leg.br",
    initials: "SN",
    sala: "1112",
    gv: "40º GV"
  },
  {
    id: "senival-moura",
    name: "Senival Moura",
    party: "PT",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2014/10/senival_2025.jpg",
    phone: "(11) 3396-4530",
    email: "senival@saopaulo.sp.leg.br",
    initials: "SM",
    sala: "1008",
    andar: "10º",
    gv: "48º GV"
  },
  {
    id: "silvao-leite",
    name: "Silvão Leite",
    party: "UNIAO",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/silvao_2025.jpg",
    phone: "(11) 3396-4237",
    email: "silvaoleite@saopaulo.sp.leg.br",
    initials: "SL",
    sala: "719",
    gv: "33º GV",
    isLeader: true
  },
  {
    id: "silvia-da-bancada-feminista",
    name: "Silvia da Bancada Feminista",
    party: "PSOL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2020/12/silvia_2025.jpg",
    phone: "(11) 3396-4499",
    email: "bancadafeminista@saopaulo.sp.leg.br",
    initials: "SF",
    sala: "706",
    andar: "7º",
    gv: "47º GV"
  },
  {
    id: "silvinho-leite",
    name: "Silvinho Leite",
    party: "UNIAO",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2024/11/silvinho_2025.jpg",
    phone: "(11) 3396-4335",
    email: "silvinholeite@saopaulo.sp.leg.br",
    initials: "SL",
    sala: "520",
    gv: "34º GV"
  },
  {
    id: "simone-ganem",
    name: "Simone Ganem",
    party: "PODE",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/simone_2025.jpg",
    phone: "(11) 3396-4287",
    email: "simoneganem@saopaulo.sp.leg.br",
    initials: "SG",
    sala: "313",
    gv: "46º GV"
  },
  {
    id: "sonaira-fernandes",
    name: "Sonaira Fernandes",
    party: "PARTIDO LIBERAL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2021/01/sonaira2025.jpg",
    phone: "(11) 3396-4446",
    email: "sonaira@saopaulo.sp.leg.br",
    initials: "SF",
    sala: "1010",
    gv: "52º GV"
  },
  {
    id: "thammy-miranda",
    name: "Thammy Miranda",
    party: "PSD",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/thammy_2025.jpg",
    phone: "(11) 3396-4472",
    email: "assessoriadothammy@gmail.com",
    initials: "TM",
    sala: "914",
    andar: "9º",
    gv: "54º GV",
    isLeader: true
  },
  {
    id: "zoe-martinez",
    name: "Zoe Martínez",
    party: "PARTIDO LIBERAL",
    photo: "https://www.saopaulo.sp.leg.br/wp-content/uploads/2025/02/zoe_2025.jpg",
    phone: "(11) 3396-5124",
    email: "zoemartinez@saopaulo.sp.leg.br",
    initials: "ZM",
    sala: "406",
    gv: "51º GV"
  }
];

// Mapeamento de partidos para temas/comissões típicas
export const PARTY_THEMES: Record<string, string[]> = {
  'PT': ['saude', 'educacao', 'habitacao', 'assistencia_social', 'direitos_humanos'],
  'PSOL': ['meio_ambiente', 'educacao', 'direitos_humanos', 'assistencia_social', 'cultura'],
  'PARTIDO LIBERAL': ['seguranca', 'transporte', 'economia', 'saude'],
  'PL': ['seguranca', 'transporte', 'economia', 'saude'],
  'UNIAO': ['urbanismo', 'transporte', 'economia', 'infraestrutura'],
  'MDB': ['saude', 'educacao', 'infraestrutura', 'transporte'],
  'PP': ['seguranca', 'transporte', 'economia', 'infraestrutura'],
  'PSD': ['economia', 'transporte', 'urbanismo', 'saude'],
  'PODE': ['saude', 'educacao', 'transporte', 'urbanismo'],
  'Republicanos': ['seguranca', 'economia', 'transporte', 'assistencia_social'],
  'PSB': ['meio_ambiente', 'educacao', 'cultura', 'mobilidade'],
  'NOVO': ['economia', 'transparencia', 'urbanismo', 'transporte'],
  'PV': ['meio_ambiente', 'sustentabilidade', 'mobilidade', 'cultura'],
  'Rede Sustentabilidade': ['meio_ambiente', 'sustentabilidade', 'direitos_humanos', 'cultura']
};

// Mapeamento legado para compatibilidade com IDs numéricos existentes
export const LEGACY_ID_MAP: Record<string, string> = {
  '1': 'rubinho-nunes', // Histórico - Milton Leite não mais ativo
  '2': 'rubinho-nunes',
  '3': 'edir-sales',
  '4': 'joao-jorge',
  '5': 'george-hato',
  '6': 'celso-giannazi',
  '7': 'nabil-bonduki',
  '8': 'luna-zarattini',
  '9': 'jair-tatto',
  '10': 'helio-rodrigues',
  '11': 'senival-moura',
  '12': 'joao-ananias',
  '13': 'alessandro-guedes',
  '14': 'dheison-silva',
  '15': 'edir-sales',
  '16': 'eliseu-gabriel',
  '17': 'renata-falzoni',
  '18': 'marina-bragante',
  '19': 'roberto-tripoli',
  '20': 'luana-alves'
};

// Helper para resolver ID legado para slug
export function resolveLegacyId(id: string): string {
  return LEGACY_ID_MAP[id] || id;
}

// Helper para encontrar vereador por ID (suporta legado e slug)
export function findVereadorById(id: string): Vereador | undefined {
  const resolvedId = resolveLegacyId(id);
  return vereadores.find(v => v.id === resolvedId);
}
