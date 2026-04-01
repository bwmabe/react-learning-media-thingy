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

  type Query {
    files(filter: String): [FileMetadata]
  }
`