if (secrets.rapidapiKey == "") {
  throw Error("RAPID_API_KEY environment variable not set.")
};

const rundownId = args[0];
const sportspageId = args[1];

const convertToUnixTimestamp = (dateString) => {
  let date = new Date(dateString);
  date.setMinutes(0, 0, 0);
  let timestamp = date.getTime();
  timestamp = Math.floor(timestamp / 1000);
  return timestamp;
};

const convertToUnixTimestampRundownActual = (dateString) => {
  let date = new Date(dateString);
  let timestamp = date.getTime();
  timestamp = Math.floor(timestamp / 1000);
  return timestamp;
}

const convertContestDataToUint256 = (league, eventTime, awayTeam, homeTeam) => {
  const leagueNumeric = league * 1e18;
  const awayTeamNumeric = awayTeam * 1e14;
  const homeTeamNumeric = homeTeam * 1e10;
  return (BigInt(leagueNumeric) + BigInt(awayTeamNumeric) + BigInt(homeTeamNumeric) + BigInt(eventTime));
};

const rundownRequest = Functions.makeHttpRequest({
  url: 'https://therundown-therundown-v1.p.rapidapi.com/events/' + rundownId + '?include=scores',
  headers: {
    'x-rapidapi-host': 'therundown-therundown-v1.p.rapidapi.com',
    'x-rapidapi-key': secrets.rapidapiKey
  },
});

const sportspageRequest = Functions.makeHttpRequest({
  url: 'https://sportspage-feeds.p.rapidapi.com/gameById?gameId=' + +sportspageId,
  headers: {
    'x-rapidapi-host': 'sportspage-feeds.p.rapidapi.com',
    'x-rapidapi-key': secrets.rapidapiKey
  },
});

const rundownResponse = await rundownRequest;
const sportspageResponse = await sportspageRequest;

const leagueLegend = [
  {
    league: 'NCAAF',
    id: 1
  },
  {
    league: 'NFL',
    id: 2
  },
  {
    league: 'MLB',
    id: 3
  },
  {
    league: 'NBA',
    id: 4
  },
  {
    league: 'NCAAB',
    id: 5
  },
  {
    league: 'NHL',
    id: 6
  },
  {
    league: 'MMA',
    id: 7
  },
  {
    league: 'WNBA',
    id: 8
  },
  {
    league: 'CFL',
    id: 9
  }
];
const teamLegend = [
  {
    leagueId: 1,
    sportspageTeamName: 'San Jose State',
    id: 206
  },
  {
    leagueId: 1,
    sportspageTeamName: 'Hawaii',
    id: 155
  },
  {
    leagueId: 1,
    sportspageTeamName: 'Louisiana-Lafayette',
    id: 167
  },
  {
    leagueId: 1,
    sportspageTeamName: 'Louisiana-Monroe',
    id: 168
  },
  {
    leagueId: 1,
    sportspageTeamName: 'Mississippi',
    id: 197
  },
  {
    leagueId: 5,
    sportspageTeamName: 'Connecticut',
    id: 263
  },
];

let rundownResult;
let sportspageResult;

let rundownAwayTeamId;
let rundownHomeTeamId;
let rundownAwayTeamString;
let rundownHomeTeamString;

let leagueReturnValue;
let eventTimeReturnValue;
let awayTeamReturnValue;
let homeTeamReturnValue;

if (!rundownResponse.error) {
  if (rundownResponse.data['score']['event_status'] === 'STATUS_SCHEDULED') {
    const league = rundownResponse.data['sport_id'];
    const eventTime = convertToUnixTimestamp((rundownResponse.data['event_date']).trim());
    eventTimeReturnValue = convertToUnixTimestampRundownActual((rundownResponse.data['event_date']).trim());
    const awayTeam = rundownResponse.data['teams_normalized']['0']['team_id'];
    const homeTeam = rundownResponse.data['teams_normalized']['1']['team_id'];
    rundownAwayTeamId = awayTeam;
    rundownHomeTeamId = homeTeam;
    if (league === 1 || league === 5) {
      rundownAwayTeamString = rundownResponse.data['teams_normalized']['0']['name'];
      rundownHomeTeamString = rundownResponse.data['teams_normalized']['1']['name'];
    } else {
      rundownAwayTeamString = rundownResponse.data['teams_normalized']['0']['name'] + ' ' + rundownResponse.data['teams_normalized']['0']['mascot'];
      rundownHomeTeamString = rundownResponse.data['teams_normalized']['1']['name'] + ' ' + rundownResponse.data['teams_normalized']['1']['mascot'];
    }
    leagueReturnValue = league;
    awayTeamReturnValue = awayTeam;
    homeTeamReturnValue = homeTeam;
    rundownResult = convertContestDataToUint256(league, eventTime, awayTeam, homeTeam);
  }
} else {
  throw Error("Rundown API error:", rundownResponse.error);
};

if (!sportspageResponse.error) {
  if (sportspageResponse.data['results']['0']['status'] === 'scheduled') {
    const leagueString = sportspageResponse.data['results']['0']['details']['league'].trim();
    const league = leagueLegend.find(x => x.league === leagueString).id;
    const eventTime = convertToUnixTimestamp((sportspageResponse.data['results']['0']['schedule']['date']).trim());
    const awayTeamString = sportspageResponse.data['results']['0']['teams']['away']['team'].trim();
    const homeTeamString = sportspageResponse.data['results']['0']['teams']['home']['team'].trim();
    const awayTeam = (() => {
      if ((league === 1 || league === 5) && teamLegend.find(x => x.leagueId === league && x.sportspageTeamName === awayTeamString)) {
        return teamLegend.find(x => x.leagueId === league && x.sportspageTeamName === awayTeamString).id;
      } else if (awayTeamString === rundownAwayTeamString) {
        return rundownAwayTeamId;
      } else {
        throw Error("Sportspage away team name error")
      }
    })();
    const homeTeam = (() => {
      if ((league === 1 || league === 5) && teamLegend.find(x => x.leagueId === league && x.sportspageTeamName === homeTeamString)) {
        return teamLegend.find(x => x.leagueId === league && x.sportspageTeamName === homeTeamString).id;
      } else if (homeTeamString === rundownHomeTeamString) {
        return rundownHomeTeamId;
      } else {
        throw Error("Sportspage home team name error")
      }
    })();
    sportspageResult = convertContestDataToUint256(league, eventTime, awayTeam, homeTeam);
  }
} else {
  throw Error("Sportspage API error:", sportspageResponse.error);
};

if (rundownResult === sportspageResult) {
  return Functions.encodeUint256(convertContestDataToUint256(leagueReturnValue, eventTimeReturnValue, awayTeamReturnValue, homeTeamReturnValue));
} else {
  throw Error("Invalid contest IDs")
};
