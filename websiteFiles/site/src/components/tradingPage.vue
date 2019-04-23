<template>
  <v-container fluid grid-list-xl>
    <v-layout wrap>
      <v-flex xs3>
        <v-select
          :items="currencies"
          outline
          attach
          label="Starting Currency"
          v-model="startingCurrency"
        ></v-select>
      </v-flex>
      <v-flex xs3>
        <v-select :items="currencies" outline label="Target Currency" v-model="targetCurrency"></v-select>
      </v-flex>
      <v-flex xs3>
        <v-select :items="leagues" outline label="League" v-model="leagueSelected"></v-select>
      </v-flex>
      <v-flex xs3>
        <v-select
          :items="tradeNumberOptions"
          outline
          label="Max number of trades"
          v-model="maxTrades"
        ></v-select>
      </v-flex>
    </v-layout>
    <v-flex>
      <tradesContainer
        :startCurrency="startingCurrency"
        :targetCurrency="targetCurrency"
        :selectedLeague="leagueSelected"
        :maxTrades="maxTrades"
      ></tradesContainer>
    </v-flex>
  </v-container>
</template>

<script>
import axios from "axios";
import tradesContainer from "./tradesContainer";
let leagues = [];
axios.get("http://localhost:3000/sql/leagues").then(function(response) {
  for (var i = 0; i < response.data.length; i++) {
    leagues.push(JSON.stringify(response.data[i].leagueName).replace(/"/g, ""));
  }
});
let currencies = [];
axios.get("http://localhost:3000/sql/currencies").then(function(response) {
  for (var i = 0; i < response.data.length; i++) {
    currencies.push(
      JSON.stringify(response.data[i].currencyTextName).replace(/"/g, "")
    );
  }
});
export default {
  components: {
    tradesContainer
  },
  methods: {},
  data: () => ({
    tradeNumberOptions: [1, 2, 3],
    leagues,
    currencies,
    startingCurrency: "",
    targetCurrency: "",
    leagueSelected: "",
    maxTrades: "",
    text: ""
  })
};
</script>