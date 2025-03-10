/* eslint-disable no-underscore-dangle */

const { version } = require('../../package.json');
const { md5 } = require('./misc');
const {
	quick,
	relativePool,
} = require('./threads');

const getAverageTimes = closedTickets => quick('stats', async w => ({
	avgResolutionTime: await w.getAvgResolutionTime(closedTickets),
	avgResponseTime: await w.getAvgResponseTime(closedTickets),
}));

/**
 * Report stats to Houston
 * @param {import("../client")} client
 */
async function sendToHouston(client) {
	const guilds = await client.prisma.guild.findMany({
		include: {
			categories: { include: { _count: { select: { questions: true } } } },
			tags: true,
			tickets: {
				select: {
					closedAt: true,
					createdAt: true,
					firstResponseAt: true,
				},
			},
		},
	});
	const users = await client.prisma.user.aggregate({
		_count: true,
		_sum: { messageCount: true },
	});
	const messages = users._sum.messageCount;
	const stats = {
		activated_users: users._count,
		arch: process.arch,
		database: process.env.DB_PROVIDER,
		guilds: await relativePool(.25, 'stats', pool => Promise.all(
			guilds
				.filter(guild => client.guilds.cache.has(guild.id))
				.map(guild => {
					guild.members = client.guilds.cache.get(guild.id).memberCount;
					return pool.queue(w => w.aggregateGuildForHouston(guild, messages));
				}),
		)),
		id: md5(client.user.id),
		node: process.version,
		os: process.platform,
		version,
	};
	const delta = guilds.length - stats.guilds.length;

	if (delta !== 0) {
		client.log.warn('%d guilds are not cached and were excluded from the stats report', delta);
	}

	try {
		client.log.verbose('Reporting to Houston:', stats);
		const res = await fetch('https://stats.discordtickets.app/api/v4/houston', {
			body: JSON.stringify(stats),
			headers: { 'content-type': 'application/json' },
			method: 'POST',
		});
		if (!res.ok) throw res;
		client.log.success('Posted client stats');
		client.log.debug(res);
	} catch (res) {
		client.log.warn('The following error is not important and can be safely ignored');
		try {
			const json = await res.json();
			client.log.error('An error occurred whilst posting stats:', json);
		} catch (error) {
			client.log.error('An error occurred whilst posting stats and the response couldn\'t be parsed:', error.message);
		}
		client.log.debug(res);
	}
};

module.exports = {
	getAverageTimes,
	sendToHouston,
};
