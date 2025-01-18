if (secrets.jsonapiKey == "") {
  throw Error("JSON_API_KEY environment variable not set.")
};

const jsonoddsId = args[0];

const normalizeOdds = (odds) => {
  if (!odds) return 0;
  
  if (odds < -10000) {
    return -10000;
  }
  
  if (odds > 10000) {
    return 10000;
  }
  
  return odds;
};

const convertOddsDataToUint256 = (awayOdds, homeOdds) => {
  const normalizedAwayOdds = normalizeOdds(awayOdds) + 10000;
  const normalizedHomeOdds = normalizeOdds(homeOdds) + 10000;
  
  const awayOddsNumeric = BigInt(normalizedAwayOdds) * BigInt(100000);
  const homeOddsNumeric = BigInt(normalizedHomeOdds);
  
  return awayOddsNumeric + homeOddsNumeric;
};

const jsonoddsRequest = Functions.makeHttpRequest({
  url: 'https://jsonodds.com/api/odds?oddType=Game',
  headers: {
    'x-api-key': secrets.jsonapiKey
  }
});

const jsonoddsResponseAll = await jsonoddsRequest;

const jsonoddsResponse = jsonoddsResponseAll.data.find(contest => contest.ID === jsonoddsId);

let jsonoddsResult;

let awayMoneylineOdds;
let homeMoneylineOdds;

if (!jsonoddsResponseAll.error) {
  if (jsonoddsResponse) {
    awayMoneylineOdds = parseInt(jsonoddsResponse['Odds'][0]['MoneyLineAway']);
    homeMoneylineOdds = parseInt(jsonoddsResponse['Odds'][0]['MoneyLineHome']);
  }
} else {
  throw Error("Jsonodds API error:", jsonoddsResponseAll.error);
};

return Functions.encodeUint256(convertOddsDataToUint256(awayMoneylineOdds, homeMoneylineOdds));