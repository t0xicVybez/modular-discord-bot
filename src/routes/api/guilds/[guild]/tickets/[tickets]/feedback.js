const { quick } = require('../../../../../../lib/threads');

module.exports.get = fastify => ({
  handler: async (req, res) => {
    /** @type {import('client')} */
    const client = req.routeOptions.config.client;
    
    // Check if ticket exists and belongs to the guild
    const ticket = await client.prisma.ticket.findUnique({
      where: {
        id: req.params.ticket,
        guildId: req.params.guild
      },
      include: {
        category: {
          select: {
            name: true,
            emoji: true
          }
        }
      }
    });
    
    if (!ticket) {
      return res.code(404).send({
        error: 'Not Found',
        message: 'Ticket not found',
        statusCode: 404
      });
    }
    
    // Get the feedback for this ticket
    const feedback = await client.prisma.feedback.findUnique({
      where: {
        ticketId: req.params.ticket
      }
    });
    
    if (!feedback) {
      return {
        exists: false,
        ticketInfo: {
          id: ticket.id,
          number: ticket.number,
          categoryName: ticket.category.name,
          categoryEmoji: ticket.category.emoji,
          createdAt: ticket.createdAt,
          closedAt: ticket.closedAt,
          topic: ticket.topic ? await quick('crypto', worker => worker.decrypt(ticket.topic)) : null
        }
      };
    }
    
    // Return feedback with decrypted comment
    const decryptedFeedback = {
      ...feedback,
      comment: feedback.comment ? await quick('crypto', worker => worker.decrypt(feedback.comment)) : null,
      exists: true,
      ticketInfo: {
        id: ticket.id,
        number: ticket.number,
        categoryName: ticket.category.name,
        categoryEmoji: ticket.category.emoji,
        createdAt: ticket.createdAt,
        closedAt: ticket.closedAt,
        topic: ticket.topic ? await quick('crypto', worker => worker.decrypt(ticket.topic)) : null
      }
    };
    
    return decryptedFeedback;
  },
  onRequest: [fastify.authenticate, fastify.isMember]
});

module.exports.post = fastify => ({
  handler: async (req, res) => {
    /** @type {import('client')} */
    const client = req.routeOptions.config.client;
    const userId = req.user.id;
    const { rating, comment } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.code(400).send({
        error: 'Bad Request',
        message: 'Rating must be between 1 and 5',
        statusCode: 400
      });
    }
    
    // Check if ticket exists and belongs to the guild
    const ticket = await client.prisma.ticket.findUnique({
      where: {
        id: req.params.ticket,
        guildId: req.params.guild
      },
      include: {
        category: true
      }
    });
    
    if (!ticket) {
      return res.code(404).send({
        error: 'Not Found',
        message: 'Ticket not found',
        statusCode: 404
      });
    }
    
    // Check if user has permission to provide feedback (ticket creator or staff)
    if (ticket.createdById !== userId && !(await client.isStaff(req.params.guild, userId))) {
      return res.code(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to submit feedback for this ticket',
        statusCode: 403
      });
    }
    
    // Encrypt comment if provided
    let encryptedComment = null;
    if (comment) {
      encryptedComment = await quick('crypto', worker => worker.encrypt(comment));
    }
    
    // Create or update feedback
    const data = {
      comment: encryptedComment,
      guild: { connect: { id: ticket.guildId } },
      rating,
      ticket: { connect: { id: ticket.id } },
      user: { connect: { id: userId } }
    };
    
    const feedback = await client.prisma.feedback.upsert({
      create: data,
      update: data,
      where: {
        ticketId: ticket.id
      }
    });
    
    return {
      success: true,
      feedbackId: feedback.id
    };
  },
  onRequest: [fastify.authenticate, fastify.isMember]
});

module.exports.delete = fastify => ({
  handler: async (req, res) => {
    /** @type {import('client')} */
    const client = req.routeOptions.config.client;
    const userId = req.user.id;
    
    // Check if feedback exists
    const feedback = await client.prisma.feedback.findFirst({
      where: {
        ticketId: req.params.ticket,
        userId: userId
      }
    });
    
    if (!feedback) {
      return res.code(404).send({
        error: 'Not Found',
        message: 'Feedback not found',
        statusCode: 404
      });
    }
    
    // Delete the feedback
    await client.prisma.feedback.delete({
      where: {
        id: feedback.id
      }
    });
    
    return {
      success: true
    };
  },
  onRequest: [fastify.authenticate, fastify.isMember]
});