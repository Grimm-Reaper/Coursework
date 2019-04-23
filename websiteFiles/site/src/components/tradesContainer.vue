<template>
  <v-container fluid grid-list-xl>
    <v-list-tile v-for="item in items" :key="item.path">
      <v-card width="1200">
        <v-card-text>{{item.path}}</v-card-text>
      </v-card>
    </v-list-tile>
  </v-container>
</template>

<script>
import axios from "axios";
import trades from "./trades.vue";
let items = [];

export default {
  components: { trades },
  props: ["targetCurrency", "selectedLeague", "maxTrades", "startCurrency"],
  data: () => ({
    items
  }),
  methods: {
    change() {
      let startCurrency = this.$props.startCurrency,
        targetCurrency = this.$props.targetCurrency,
        selectedLeague = this.$props.selectedLeague,
        lifeSpan = this.$props.maxTrades;
      let scope = this;
      this.items = "";
      if (
        (startCurrency != "") &
        (targetCurrency != "") &
        (lifeSpan != "") &
        (selectedLeague != "")
      ) {
        axios
          .get(
            (
              "http://localhost:3000/sql/gettradepaths/?" +
              startCurrency +
              "$" +
              targetCurrency +
              "$" +
              selectedLeague +
              "$" +
              lifeSpan
            ).replace(/\ /g, "!")
          )
          .then(function(response) {
            scope.items = response.data;
            console.log(scope.items);
          });
      } else {
        console.log("not all selected");
      }
    }
  },
  watch: {
    startCurrency() {
      this.change();
    },
    targetCurrency() {
      this.change();
    },
    selectedLeague() {
      this.change();
    },
    maxTrades() {
      this.change();
    }
  }
};
</script>