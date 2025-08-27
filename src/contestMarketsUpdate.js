if (secrets.jsonapiKey == "") {
  throw Error("JSON_API_KEY environment variable not set.");
}

const jsonoddsId = args[2];

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

const convertFullMarketDataToUint256 = (oddsData) => {
  const odds = oddsData.Odds[0]; // First odds object
  
  // Get raw values
  let moneylineAway = odds.MoneyLineAway;
  let moneylineHome = odds.MoneyLineHome;
  let spreadNumber = odds.PointSpreadAway;
  let spreadAwayLine = odds.PointSpreadAwayLine;
  let spreadHomeLine = odds.PointSpreadHomeLine;
  let totalNumber = odds.TotalNumber;
  let overLine = odds.OverLine;
  let underLine = odds.UnderLine;
  
  // Handle pick 'em edge case
  // Detect pick em scenario: no moneyline odds, spread ~0, but spread odds exist
  if ((moneylineAway === "0" || !moneylineAway || moneylineAway === 0) && 
      (moneylineHome === "0" || !moneylineHome || moneylineHome === 0) &&
      (spreadNumber === "0.0" || Math.abs(parseFloat(spreadNumber)) < 0.1) &&
      spreadAwayLine && spreadHomeLine) {
      
    // Use spread odds as moneyline odds for pick 'em
    moneylineAway = spreadAwayLine;
    moneylineHome = spreadHomeLine;
    
    // Keep spread as 0 with the same odds
    spreadNumber = "0.0";
    // spreadAwayLine and spreadHomeLine already exist
  }
  
  // Extract and normalize all odds (add 10000 to each for negative handling)
  const normalizedMoneylineAway = normalizeOdds(parseInt(moneylineAway)) + 10000;
  const normalizedMoneylineHome = normalizeOdds(parseInt(moneylineHome)) + 10000;
  const normalizedSpreadAway = normalizeOdds(parseInt(spreadAwayLine)) + 10000;
  const normalizedSpreadHome = normalizeOdds(parseInt(spreadHomeLine)) + 10000;
  const normalizedOverLine = normalizeOdds(parseInt(overLine)) + 10000;
  const normalizedUnderLine = normalizeOdds(parseInt(underLine)) + 10000;
  
  // Extract and normalize numbers (add 1000 offset for negatives)
  // Convert to integers: -1.5 → -15 + 1000 → 985, 8.5 → 85 + 1000 → 1085
  const normalizedSpreadNumber = Math.round(parseFloat(spreadNumber) * 10) + 1000;
  const normalizedTotalNumber = Math.round(parseFloat(totalNumber) * 10) + 1000;
  
  // Pack into 38-digit format matching OracleModule.extractContestMarketData:
  // [moneylineAway(5)][moneylineHome(5)][spread(4)][spreadAwayLine(5)][spreadHomeLine(5)][total(4)][overLine(5)][underLine(5)]
  return BigInt(normalizedMoneylineAway) * BigInt(1e33) +
         BigInt(normalizedMoneylineHome) * BigInt(1e28) +
         BigInt(normalizedSpreadNumber) * BigInt(1e24) +
         BigInt(normalizedSpreadAway) * BigInt(1e19) +
         BigInt(normalizedSpreadHome) * BigInt(1e14) +
         BigInt(normalizedTotalNumber) * BigInt(1e10) +
         BigInt(normalizedOverLine) * BigInt(1e5) +
         BigInt(normalizedUnderLine);
};

const jsonoddsRequest = Functions.makeHttpRequest({
  url: 'https://jsonodds.com/api/odds?oddType=Game',
  headers: {
    'x-api-key': secrets.jsonapiKey
  }
});

const jsonoddsResponseAll = await jsonoddsRequest;

const jsonoddsResponse = jsonoddsResponseAll.data.find(contest => contest.ID === jsonoddsId);

if (!jsonoddsResponseAll.error) {
  if (jsonoddsResponse && jsonoddsResponse.Odds && jsonoddsResponse.Odds.length > 0) {
    // Convert all market data to the packed uint256 format
    const packedMarketData = convertFullMarketDataToUint256(jsonoddsResponse);
    return Functions.encodeUint256(packedMarketData);
  } else {
    throw Error("Contest not found or no odds available for ID: " + jsonoddsId);
  }
} else {
  throw Error("Jsonodds API error: " + jsonoddsResponseAll.error);
}