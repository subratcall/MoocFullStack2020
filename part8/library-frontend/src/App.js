
import React, { useState, useEffect } from 'react'
import {  useApolloClient, useSubscription } from '@apollo/client'
import Authors from './components/Authors'
import Books from './components/Books'
import NewBook from './components/NewBook'
import SetBirthyear from './components/SetBirthyear'
import Login from './components/Login'
import Recommend from "./components/Recommend";
import {BOOK_ADDED, ALL_BOOKS} from "./queries";

const App = () => {
    const [page, setPage] = useState('authors')
    const [token, setToken] = useState(null)
    const [errorMessage, setErrorMessage] = useState(null)
    const client = useApolloClient()

    const updateCacheWith = (addedBook) => {
        const includedIn = (set, object) =>
            set.map(p => p.id).includes(object.id)

        const dataInStore = client.readQuery({query: ALL_BOOKS})
        if (!includedIn(dataInStore.allBooks, addedBook)) {
            client.writeQuery({
                query: ALL_BOOKS,
                data: { allBooks : dataInStore.allBooks.concat(addedBook) }
            })
        }
    }

    useSubscription(BOOK_ADDED, {
        onSubscriptionData: ({ subscriptionData }) => {
            const addedBook = subscriptionData.data.bookAdded
            window.alert(`New book '${addedBook.title}' added`)
            updateCacheWith(addedBook)
        }
    })

    useEffect(() => {
        const token = localStorage.getItem('library-app-user-token')
        if ( token ) {
            setToken(token)
        }
    }, [])

    const logout = () => {
        setToken(null)
        localStorage.clear()
        client.resetStore()
    }

    const notify = (message) => {
        setErrorMessage(message)
        setTimeout(() => {
            setErrorMessage(null)
        }, 5000)
    }

    if (!token) {
        return (
            <div>
            <div>
                <button onClick={() => setPage('authors')}>authors</button>
                <button onClick={() => setPage('books')}>books</button>
                <button onClick={() => setPage('login')}>login</button>
            </div>

            <Authors
                show={page === 'authors'}
            />

            <Books
                show={page === 'books'}
            />

            <Login
            show={page === 'login'}
            setPage={setPage}
            token={token}
            setToken={setToken}
            setError={notify}
            errorMessage={errorMessage}
            />
        </div>
    )
    }
    return (
    <div>
      <div>
        <button onClick={() => setPage('authors')}>authors</button>
          <button onClick={() => setPage('birthyear')}>set birthyear</button>
          <button onClick={() => setPage('books')}>books</button>
          <button onClick={()=> setPage( 'recommend')}>recommend</button>
          <button onClick={() => setPage('add')}>add book</button>
          <button onClick={() => logout()}>logout</button>
      </div>

      <Authors
        show={page === 'authors'}
      />
      <SetBirthyear
      show={page==='birthyear'}
      setError={notify}
      errorMessage={errorMessage}
      />

      <Books
        show={page === 'books'}
      />
        <Recommend
            show={page === 'recommend'}
            page={page}
        />

      <NewBook
        show={page === 'add'}
        setError={notify}
        errorMessage={errorMessage}
        updateCacheWith={updateCacheWith}
      />

    </div>
  )
}

export default App