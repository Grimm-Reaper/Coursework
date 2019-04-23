<template>
  <v-container fluid grid-list-xl>
    <v-layout wrap>
      <v-flex xs6>
        <v-select
          :items="currencies"
          outline
          label="Starting Currency"
          v-model="startCurrency"
          @input="update()"
        ></v-select>
      </v-flex>
      <v-flex xs6>
        <v-select
          :items="leagues"
          outline
          label="League"
          v-model="leagueSelected"
          @input="update()"
        ></v-select>
      </v-flex>
    </v-layout>
    <v-flex>
      <graphCard :selectedCurrency="startCurrency" :selectedLeague="leagueSelected"></graphCard>
    </v-flex>
  </v-container>
</template>

<script>
import axios from "axios";
import graphCard from "./graphCard";
let leagues = [];
axios.get("http://localhost:3000/sql/leagues").then(function(response) {
  for (var i = 0; i < response.data.length; i++) {
    leagues.push(
      JSON.stringify(response.data[i].leagueName).replace(/\"/g, "")
    );
  }
});
let currencies = [];
axios.get("http://localhost:3000/sql/currencies").then(function(response) {
  for (var i = 0; i < response.data.length; i++) {
    currencies.push(
      JSON.stringify(response.data[i].currencyTextName).replace(/\"/g, "")
    );
  }
});
export default {
  components: {
    graphCard
  },
  methods: {
    update() {
      console.log("wait");
      this.graphCardInput = "please";
    },
    getData() {
      console.log("test");
    }
  },
  data: () => ({
    leagues,
    currencies,
    startCurrency: "",
    leagueSelected: "",
    graphCardInput: "start"
  })
};
</script>