export const typeDefs = `#graphql
  type FileMetadata {
    id: String
    user: String
    service: String
    title: String
    substring: String
    filename: String
    published: String
  }

  type Thumb {
    user: String!
    filename: String!
  }

  type Query {
    users: [String]
    files(filter: String, user: String): [FileMetadata]
    thumbs: [Thumb]
  }

  type Mutation {
    setThumb(user: String!, filename: String!): Thumb
  }
`