import React from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx"; // Add this import
import "./App.css";

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        {/* Stats cards and leaderboards will go here */}
      </main>
      <Footer /> {/* Add this line */}
    </div>
  );
}

export default App;