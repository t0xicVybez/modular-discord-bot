/* eslint-disable no-underscore-dangle */

const ms = require('ms');
const pkg = require('../../../package.json');
const { getAverageTimes } = require('../../lib/stats');
const { quick } = require('../../lib/threads');

module.exports.get = () => ({
	handler: async req => {
		/** @type {import("client")} */
		const client = req.routeOptions.config.client;
		const cacheKey = 'cache/stats/client';
		let cached = await client.keyv.get(cacheKey);
		if (!cached) {
			const [
				categories,
				members,
				tags,
				tickets,
				closedTickets,
				users,
			] = await Promise.all([
				client.prisma.category.count(),
				quick('stats', w => w.sum(client.guilds.cache.map(g => g.memberCount))),
				client.prisma.tag.count(),
				client.prisma.ticket.count(),
				client.prisma.ticket.findMany({
					select: {
						closedAt: true,
						createdAt: true,
						firstResponseAt: true,
					},
					where: {
						firstResponseAt: { not: null },
						open: false,
					},
				}),
				client.prisma.user.aggregate({
					_count: true,
					_sum: { messageCount: true },
				}),
			]);
			const {
				avgResolutionTime,
				avgResponseTime,
			} = await getAverageTimes(closedTickets);

			cached = {
				avatar: client.user.avatarURL(),
				discriminator: client.user.discriminator,
				id: client.user.id,
				public: (process.env.PUBLIC_BOT === 'true'),
				stats: {
					activatedUsers: users._count,
					archivedMessages: users._sum.messageCount,
					avgResolutionTime: ms(avgResolutionTime),
					avgResponseTime: ms(avgResponseTime),
					categories,
					guilds: client.guilds.cache.size,
					members,
					tags,
					tickets,
				},
				username: client.user.username,
				version: pkg.version,
			};
			await client.keyv.set(cacheKey, cached, ms('15m'));
		}
		return cached;
	},
});
