const { ApolloServer, UserInputError, gql } = require('apollo-server')
const mongoose = require('mongoose')
const Author = require('./models/author')
const Book = require('./models/book')
const User = require('./models/user')
mongoose.set('useFindAndModify', false)
mongoose.set('useCreateIndex', true);
require('dotenv').config()
const jwt = require('jsonwebtoken')
const MONGODB_URI = process.env.MONGODB_URI
const JWT_SECRET = process.env.JWT_SECRET
const { PubSub } = require('apollo-server')
const pubsub = new PubSub()

console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('connected to MongoDB')
    })
    .catch((error) => {
        console.log('error connection to MongoDB:', error.message)
    })

let authors = [
    {
        name: 'Robert Martin',
        id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
        born: 1952,
    },
    {
        name: 'Martin Fowler',
        id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
        born: 1963
    },
    {
        name: 'Fyodor Dostoevsky',
        id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
        born: 1821
    },
    {
        name: 'Joshua Kerievsky', // birthyear not known
        id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
    },
    {
        name: 'Sandi Metz', // birthyear not known
        id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
    },
]

/*
 * Saattaisi olla järkevämpää assosioida kirja ja sen tekijä tallettamalla kirjan yhteyteen tekijän nimen sijaan tekijän id
 * Yksinkertaisuuden vuoksi tallennamme kuitenkin kirjan yhteyteen tekijän nimen
*/

let books = [
    {
        title: 'Clean Code',
        published: 2008,
        author: 'Robert Martin',
        id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
        genres: ['refactoring']
    },
    {
        title: 'Agile software development',
        published: 2002,
        author: 'Robert Martin',
        id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
        genres: ['agile', 'patterns', 'design']
    },
    {
        title: 'Refactoring, edition 2',
        published: 2018,
        author: 'Martin Fowler',
        id: "afa5de00-344d-11e9-a414-719c6709cf3e",
        genres: ['refactoring']
    },
    {
        title: 'Refactoring to patterns',
        published: 2008,
        author: 'Joshua Kerievsky',
        id: "afa5de01-344d-11e9-a414-719c6709cf3e",
        genres: ['refactoring', 'patterns']
    },
    {
        title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
        published: 2012,
        author: 'Sandi Metz',
        id: "afa5de02-344d-11e9-a414-719c6709cf3e",
        genres: ['refactoring', 'design']
    },
    {
        title: 'Crime and punishment',
        published: 1866,
        author: 'Fyodor Dostoevsky',
        id: "afa5de03-344d-11e9-a414-719c6709cf3e",
        genres: ['classic', 'crime']
    },
    {
        title: 'The Demon ',
        published: 1872,
        author: 'Fyodor Dostoevsky',
        id: "afa5de04-344d-11e9-a414-719c6709cf3e",
        genres: ['classic', 'revolution']
    },
]

const typeDefs = gql`
    type Book {
        title: String!
        published: Int!
        author: Author!
        genres: [String!]!
        id: ID!
    }
    type Author {
        name: String!,
        id: ID!
        born: Int
        bookCount: Int
    }
    type User {
        username: String!
        favoriteGenre: String!
        id: ID!
    }

    type Token {
        value: String!
    }

    type Query {
        bookCount: Int!
        authorCount: Int!
        allBooks(author: String, genre: String): [Book]!
        allAuthors: [Author]!
        me: User
    }
    type Mutation {
        addBook(
            title: String!
            published: Int!
            author: String!
            genres: [String!]
        ): Book
        editAuthor(
            name: String!
            setBornTo: Int!
        ): Author
        createUser(
            username: String!
            favoriteGenre: String!
        ): User
        login(
            username: String!
            password: String!
        ): Token
#        deleteAuthors:Author,
#        deleteBooks:Book
    },
    type Subscription {
        bookAdded: Book!
    }

`

const resolvers = {
    Query: {
        bookCount: () => Book.collection.countDocuments(),
        authorCount: () => Author.collection.countDocuments(),
        allAuthors: (root, args) => Author.find({}),
        allBooks: async (root, args) => {
            if (args.author && args.genre) {
                const author = await Author.findOne( { name: args.author } )
                const books = await Book.find( { author: { $in: [ author] } } )
                    .populate('author', {name: 1, title: 1, id: 1,bookCount:1})
                return books.filter(book => book.genres.includes(args.genre))
            }
            if (args.author) {
                const author = await Author.findOne( { name: args.author } )
                return books = await Book.find( { author: { $in: [ author] } } )
                    .populate('author', {name: 1, title: 1, id: 1,bookCount:1})
            }
            if (args.genre) {
                return await Book.find( { genres: { $in: [ args.genre] } } )
                    .populate('author', {name: 1, title: 1, id: 1,bookCount:1})
            }
            return await Book.find({}).populate('author', {name: 1, title: 1, id: 1,bookCount:1})
        },
        me: (root, args, context) => {
            return context.currentUser
        }
    },
    /*Author: {
        bookCount: async (root,args) => {
            const books =  await Book.find({}).populate('author',{id:1})
            return books.filter(book => book.author.id=== root.id).length
        }
    },*/
    Mutation: {
        addBook: async (root, args, context) => {
            const currentUser = context.currentUser
            if (!currentUser) {
                throw new AuthenticationError("not authenticated")
            }

            let savedAuthor
            let author = await Author.findOne( { name: args.author } )
            if (!author) {
                author = new Author({name: args.author, bookCount:1})
                    try {
                        savedAuthor = await author.save()
                    }catch (error)  {
                        throw new UserInputError(error.message, {
                        invalidArgs: args,}
                        )
                    }
            }else {
                author.bookCount=author.bookCount + 1
                savedAuthor= await author.save()
            }
            const book = new Book({...args, author: savedAuthor._id})
            let savedBook
            try {
                savedBook = await book.save()
            }catch (error)  {
                throw new UserInputError(error.message, {
                    invalidArgs: args,}
                )
            }
            const bookToReturn = await Book.findById(savedBook.id).populate('author', {name: 1, id: 1, born: 1,bookCount:1})
            pubsub.publish('BOOK_ADDED', { bookAdded: bookToReturn })
            return bookToReturn
        },
        editAuthor: async (root, args, context) => {
            const currentUser = context.currentUser
            if (!currentUser) {
                throw new AuthenticationError("not authenticated")
            }
            const author = await Author.findOne({name: args.name})
            if (!author) {
            }

            author.born = args.setBornTo
            return author.save()
                .catch(error => {
                    throw new UserInputError(error.message, {
                        invalidArgs: args,
                    })
                })
        },
        createUser: (root, args) => {
            const user = new User({ username: args.username,favoriteGenre:args.favoriteGenre })

            return user.save()
                .catch(error => {
                    throw new UserInputError(error.message, {
                        invalidArgs: args,
                    })
                })
        },
        login: async (root, args) => {
            const user = await User.findOne({ username: args.username })

            if ( !user || args.password !== 'secret' ) {
                throw new UserInputError("wrong credentials")
            }

            const userForToken = {
                username: user.username,
                id: user._id,
            }

            return { value: jwt.sign(userForToken, JWT_SECRET) }
        },
        /*deleteAuthors:async ()=>{
            await Author.deleteMany({})
            return Author.find({})
        },
        deleteBooks:async ()=>{
            await Book.deleteMany({})
            return Book.find({})
        }*/
    },
    Subscription: {
        bookAdded: {
            subscribe: () => pubsub.asyncIterator(['BOOK_ADDED'])
        },
    },
}


const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
        const auth = req ? req.headers.authorization : null
        if (auth && auth.toLowerCase().startsWith('bearer ')) {
            const decodedToken = jwt.verify(
                auth.substring(7), JWT_SECRET
            )
            const currentUser = await User
                .findById(decodedToken.id)
            return { currentUser }
        }
    }

})

server.listen().then(({ url, subscriptionsUrl }) => {
    console.log(`Server ready at ${url}`)
    console.log(`Subscriptions ready at ${subscriptionsUrl}`)
})
