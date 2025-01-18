if (secrets.rapidapiKey == "" ) {
  throw Error("RAPID_API_KEY environment variable not set.")
};
    
const rundownId = args[0];
const sportspageId = args[1];
  
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

let rundownResult;
let sportspageResult;
  
if (!rundownResponse.error) {
  if (rundownResponse.data['score']['event_status'] === 'STATUS_FINAL') {
    const awayScore = rundownResponse.data['score']['score_away'];
    const homeScore = rundownResponse.data['score']['score_home'];
    rundownResult = awayScore * 1000 + homeScore;
  };
} else {
  throw Error ("Rundown API error:", rundownResponse.error);
};
    
if (!sportspageResponse.error) {
  if (sportspageResponse.data['results']['0']['status'] === 'final') {
    const awayScore = sportspageResponse.data['results']['0']['scoreboard']['score']['away'];
    const homeScore = sportspageResponse.data['results']['0']['scoreboard']['score']['home'];
    sportspageResult = awayScore * 1000 + homeScore;
  }
} else {
  throw Error ("Sportspage API error:", sportspageResponse.error);
};
    
console.log("rundownResult:", rundownResult);
console.log("sportspageResult:", sportspageResult);

if (rundownResult === sportspageResult) {
  return Functions.encodeUint256(rundownResult);
} else {
  throw Error ("Invalid contest IDs")
};
