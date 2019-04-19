<template>
  <v-container fluid grid-list-xl>
    <v-layout wrap>
      <v-flex>
        <v-select
          :items="currencies"
          outline
          label="Currency"
       ></v-select>
      </v-flex>
      <v-flex>
      <v-select
          :items="leagues"
          outline
          label="League"
        ></v-select>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import axios from 'axios'
  var leagues = []
    axios.get('http://localhost:3000/sql/leagues')
  .then(function (response) {
    for (var i = 0; i < response.data.length; i++)
    {
      leagues.push(JSON.stringify(response.data[i].LeagueName).replace(/\"/g,""))
    }
  })
  var currencies = []
    axios.get('http://localhost:3000/sql/currencies')
  .then(function (response) {
    for (var i = 0; i < response.data.length; i++)
    {
      currencies.push(JSON.stringify(response.data[i].TextName).replace(/\"/g,""))
    }
  })
  export default { 
    data: () => ({
      tradeNumberOptions:[1,2,3,4],
      leagues,
      currencies
      
    }),
  }
</script>

<style>

</style>
