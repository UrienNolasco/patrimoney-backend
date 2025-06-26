Pensamentos sobre o esquema do banco:

Atualmente nossa tabela Wallet não tem uma referencia para assets. O usuario tem uma wallet e uma wallet tem uma portfolio itens e um transaction. Um transaction contem as informações da transação realizada e um portfolioItens contem a stock a quantidade e o preço médio e a gente ainda tem a tabela de stocks com mais varias informaçõs sobre o ativo em si.

Esse fluxo está confuso para mim porque a ideia da aplicação é, dentro da minha cateira eu vou fazer uma compra de 5 ações da petrobras. Apos finalizar o pedido caso eu não tenha adicionado um preço e salve na carteira, vou enviar uma requisição para a api da bolsa com o nome do ativo e aí sim vou ter a informação de quanto ele custa, ai sim a api vai me devolver a imagem dele, o nome completo. Voce acha necessario ter uma tabela stock para guardar esse ativo? 

Precisamos esclarecer o fluxo da aplicação em um nivel de banco de dados para seguirmos o desenvolvimento.