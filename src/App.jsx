import React from "react";
import Header from "./components/Header.jsx";
import StatsCards from "./components/StatsCards.jsx";
import "./App.css";

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <StatsCards />
      </main>
    </div>
  );
}

export default App;