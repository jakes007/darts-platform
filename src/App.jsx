import { useState, useEffect } from 'react'
import { db } from './firebase'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import './App.css'

function App() {
  const [testMessage, setTestMessage] = useState('')
  const [savedMessages, setSavedMessages] = useState([])

  // Function to save a test message to Firestore
  const saveTestData = async () => {
    try {
      const docRef = await addDoc(collection(db, "test"), {
        message: "Hello from Darts Platform!",
        timestamp: new Date()
      });
      setTestMessage(`Saved with ID: ${docRef.id}`);
      loadTestData(); // Reload the list after saving
    } catch (error) {
      setTestMessage(`Error: ${error.message}`);
    }
  }

  // Function to load messages from Firestore
  const loadTestData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "test"));
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      setSavedMessages(messages);
    } catch (error) {
      console.log("Error loading:", error);
    }
  }

  // Load data when the app starts
  useEffect(() => {
    loadTestData();
  }, []);

  return (
    <>
      <section id="center">
        <div>
          <h1>🎯 Darts Platform - Firestore Test</h1>
          
          <button onClick={saveTestData}>
            Save Test Data to Firestore
          </button>
          
          {testMessage && <p>{testMessage}</p>}
          
          <h2>Saved Messages:</h2>
          <ul>
            {savedMessages.map((msg) => (
              <li key={msg.id}>
                {msg.message} - {msg.timestamp?.toDate?.().toString() || 'No date'}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

export default App