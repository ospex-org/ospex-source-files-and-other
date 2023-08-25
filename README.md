# Ospex source files and other

-   scripts

    -   interact.js is a file used to interact with the ContestOracleResolved contract to create and score contests, if/when necessary

-   src
    -   contestCreation.js is the source file used create contests; this file compares the ids input to confirm they reference the same contest
    -   contestScoring.js is the source file used to score contests; this file ensures the apis return the same score
    -   createHashEthers.js is used to create a hash that will match what is on the ContestOracleResolved contract
